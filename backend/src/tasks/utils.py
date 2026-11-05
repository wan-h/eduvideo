# -*- coding: utf-8 -*-
"""
@File    : utils.py
@Author  : 一力辉
"""

import base64
import os
import re
from urllib import parse

import httpx
from openai import AsyncOpenAI

from src.middleware.storage.client import AsyncStorageClient
from src.schema import MODEL_PROVIDER
from src.server.dal.storage import SOTRAGE_COMMON_PREFIX, StorageDAL
from src.utils import config, get_file_content_mime_type

from .schema import FileDesc


def convert_file_to_data_url(file_data: bytes, mime_type: str = "") -> str:
    content_bytes = file_data
    mime_type = mime_type or "application/octet-stream"  # 如果没有提供类型，使用通用二进制流类型

    # 将图像字节进行 Base64 编码
    base64_encoded_data = base64.b64encode(content_bytes).decode("utf-8")

    # 拼接成完整的 Data URL
    data_url = f"data:{mime_type};base64,{base64_encoded_data}"
    return data_url


def storage_object_name(url: str) -> str:
    """解析本服务对象存储 URL 中的 S3 object key，非本服务 URL 返回空串"""
    parsed = parse.urlsplit(url)
    path = parse.unquote(parsed.path).lstrip("/")
    for storage_url in (
        config.middleware.storage.domain,
        config.middleware.storage.public_host,
        config.middleware.storage.host,
    ):
        base = parse.urlsplit(storage_url)
        if not base.netloc or parsed.netloc != base.netloc:
            continue
        base_path = parse.unquote(base.path).strip("/")
        if base_path:
            if path.startswith(f"{base_path}/"):
                return path[len(base_path) + 1 :]
            continue
        bucket_prefix = f"{config.middleware.storage.bucket}/"
        if path.startswith(bucket_prefix):
            return path[len(bucket_prefix) :]
    # 兜底：各进程 STORAGE_DOMAIN 不一致（API 用入口地址、worker 用内网地址）时，
    # 按本服务对象键结构识别，避免内网对象被当作外部 URL 交给云端下载
    marker = f"{SOTRAGE_COMMON_PREFIX}/users/"
    index = path.find(marker)
    if index != -1:
        return path[index:]
    return ""


async def download_file(url: str) -> FileDesc:
    """按 URL 加载文件：本服务对象存储 URL 走内网 S3 读取，外部 URL 走 HTTP 下载

    容器内 storage.domain 由 PUBLIC_HOST 派生（如 http://localhost/storage），worker
    容器访问该地址等同于访问自身，必然连接失败，因此本服务对象存储内的文件统一从内网
    MinIO 读取。
    """
    object_name = storage_object_name(url)
    if object_name:
        file_info = await AsyncStorageClient.download_file(
            object_name=object_name,
            bucket=config.middleware.storage.bucket,
        )
        return FileDesc(
            content=file_info.data,
            s3_url=url,
            filename=os.path.basename(object_name),
            content_type=file_info.content_type or get_file_content_mime_type(file_info.data),
        )

    # 外部文件走 HTTP 下载
    async with httpx.AsyncClient(verify=False, timeout=None) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        # 解析提取文件名
        parsed_url = parse.urlparse(url)
        path = parse.unquote(parsed_url.path)  # 解码URL编码
        filename = os.path.basename(path)
        content_type = get_file_content_mime_type(resp.content)

        file = FileDesc(
            # content=base64.b64encode(resp.content).decode("utf-8"),
            content=resp.content,
            s3_url=url,
            filename=filename,
            content_type=content_type,
        )
        return file


async def build_image_content_parts(urls: list[str]) -> list[dict]:
    """按全局配置（common.llm_image_input）构造大模型图片输入：url 直传或 base64 data url"""
    if config.common.llm_image_input != "base64":
        return [{"type": "image_url", "image_url": {"url": url}} for url in urls]

    contents = []
    for url in urls:
        if url.startswith("data:"):
            data_url = url
        else:
            file_desc = await download_file(url)
            data_url = convert_file_to_data_url(file_desc.content, file_desc.content_type)
        contents.append({"type": "image_url", "image_url": {"url": data_url}})
    return contents


async def _dashscope_image_bytes(
    client: AsyncOpenAI,
    model: str,
    prompt: str,
    image: tuple[str, bytes, str] | None,
) -> bytes:
    """调用 DashScope 多模态生成接口出图（同步）：wan 系列文生图与图片编辑同一入口

    带 image 时走图片编辑（如图片模型 wan2.6-image），不带 image 时走文生图（wan2.6-t2i）；
    不同模型的职责差异由调用方通过 model 参数区分。图片以 data url 传入，不依赖外网可访问地址。
    """
    content = []
    if image:
        _, image_bytes, content_type = image
        content.append({"image": convert_file_to_data_url(image_bytes, content_type)})
    content.append({"text": prompt})

    async with httpx.AsyncClient(timeout=None) as http_client:
        resp = await http_client.post(
            str(client.base_url),
            headers={"Authorization": f"Bearer {client.api_key}"},
            json={"model": model, "input": {"messages": [{"role": "user", "content": content}]}},
        )
        resp.raise_for_status()

    choices = (resp.json().get("output") or {}).get("choices") or []
    contents = ((choices[0].get("message") or {}).get("content") or []) if choices else []
    url = next((item.get("image") for item in contents if item.get("image")), "")
    if not url:
        raise RuntimeError("图片模型未返回图片地址")
    return (await download_file(url)).content


async def request_image_bytes(
    client: AsyncOpenAI,
    model: str,
    prompt: str,
    image: tuple[str, bytes, str] | None = None,
    quality: str = "auto",
    provider: MODEL_PROVIDER = MODEL_PROVIDER.OPENAI,
) -> bytes:
    """调用图片模型并统一返回图片 bytes

    DashScope 走多模态生成接口，其余按 OpenAI 兼容接口调用；gpt-image 系列不支持
    response_format 参数（始终返回 b64_json），其他模型显式要求 b64_json；
    若网关仍只返回 url，则下载后作为兜底。
    """
    if provider == MODEL_PROVIDER.ALIYUN:
        return await _dashscope_image_bytes(client, model, prompt, image)

    kwargs: dict = {"model": model, "prompt": prompt}
    if "gpt-image" not in model.lower():
        kwargs["response_format"] = "b64_json"

    if image:
        response = await client.images.edit(image=image, **kwargs)
    else:
        response = await client.images.generate(quality=quality, **kwargs)

    data = response.data[0] if response.data else None
    if data is None:
        raise RuntimeError("图片模型返回结果为空")
    if data.b64_json:
        return base64.b64decode(data.b64_json)
    if data.url:
        return (await download_file(data.url)).content
    raise RuntimeError("图片模型未返回 b64_json 或 url")


async def upload_file(
    user_id: str,
    task_id: str,
    file_name: str,
    file_data: str | bytes = "",
    file_path: str = "",
    content_type: str = "",
    metadata: dict[str, str] = {},
) -> str:
    """base64编码的图片上传"""
    if file_path:
        url = await StorageDAL.upload_file(
            user_id=user_id,
            file_name=file_name,
            file=file_path,
            tag=task_id,
            content_type=content_type,
            metadata=metadata,
        )
        return url

    file_raw_data = b""
    if isinstance(file_data, str):
        if file_data.startswith("data:") and "," in file_data:
            header, data = file_data.split(",", 1)
            base64_data = data
            # 从header中解析出 Content-Type
            # e.g., "data:image/png;base64" -> "image/png"
            if not content_type:
                parsed_content_type = header.split(";")[0].replace("data:", "")
                content_type = parsed_content_type
        else:
            base64_data = file_data
        file_raw_data = base64.b64decode(base64_data)
    else:
        file_raw_data = file_data
    if not content_type:
        content_type = get_file_content_mime_type(file_raw_data)

    url = await StorageDAL.upload_file(
        user_id=user_id,
        file_name=file_name,
        file=file_raw_data,
        tag=task_id,
        content_type=content_type,
        metadata=metadata,
    )
    return url


def replace_image_url(text: str, upload_results: dict[str, str]):
    pattern = r"!\[.*?\]\((.*?)\)"
    # ['images/xxx.jpg', 'images/xxx.jpg']
    matches = re.findall(pattern, text)
    for match in matches:
        # images/xxx.jpg
        image_name = os.path.basename(match)
        if image_name in upload_results:
            text = text.replace(match, upload_results[image_name])
    return text


def ensure_libreoffice_font_config() -> None:
    """自动为此运行环境（macOS/Linux）配置 LibreOffice CJK 中文字体映射与替代规则"""
    import os
    import sys

    from src.utils import logger

    try:
        if sys.platform == "darwin":
            lo_user_dir = os.path.expanduser("~/Library/Application Support/LibreOffice/4/user")
            os.makedirs(lo_user_dir, exist_ok=True)
            reg_file = os.path.join(lo_user_dir, "registrymodifications.xcu")

            mappings = [
                ("宋体", "PingFang SC"),
                ("SimSun", "PingFang SC"),
                ("NSimSun", "PingFang SC"),
                ("黑体", "PingFang SC"),
                ("SimHei", "PingFang SC"),
                ("微软雅黑", "PingFang SC"),
                ("Microsoft YaHei", "PingFang SC"),
                ("Microsoft YaHei UI", "PingFang SC"),
                ("楷体", "STKaiti"),
                ("KaiTi", "STKaiti"),
                ("仿宋", "STFangsong"),
                ("FangSong", "STFangsong"),
                ("汉仪书宋二KW", "PingFang SC"),
                ("汉仪中黑KW", "PingFang SC"),
                ("苹方-简", "PingFang SC"),
                ("宋体-简", "Songti SC"),
            ]
            items = []
            for idx, (src_font, dst_font) in enumerate(mappings):
                items.append(
                    f'<item oor:path="/org.openoffice.Office.Common/Font/Substitution/FontPairs">'
                    f'<node oor:name="font_map_{idx}" oor:op="replace">'
                    f'<prop oor:name="Always" oor:op="fuse"><value>true</value></prop>'
                    f'<prop oor:name="ReplaceFont" oor:op="fuse"><value>{src_font}</value></prop>'
                    f'<prop oor:name="OnScreenOnly" oor:op="fuse"><value>false</value></prop>'
                    f'<prop oor:name="SubstituteFont" oor:op="fuse"><value>{dst_font}</value></prop>'
                    f"</node></item>"
                )
            replacement_enable = '<item oor:path="/org.openoffice.Office.Common/Font/Substitution"><prop oor:name="Replacement" oor:op="fuse"><value>true</value></prop></item>'
            xml_content = (
                '<?xml version="1.0" encoding="UTF-8"?>\n'
                '<oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n'
                f"{replacement_enable}\n"
                f"{''.join(items)}\n"
                "</oor:items>\n"
            )
            with open(reg_file, "w", encoding="utf-8") as f:
                f.write(xml_content)
        else:
            fc_dir = os.path.expanduser("~/.config/fontconfig")
            os.makedirs(fc_dir, exist_ok=True)
            fc_conf = os.path.join(fc_dir, "fonts.conf")
            if not os.path.exists(fc_conf):
                conf_str = (
                    '<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig>'
                    '<match target="pattern"><test qual="any" name="family"><string>宋体</string></test><edit name="family" mode="assign" binding="same"><string>Noto Serif CJK SC</string></edit></match>'
                    '<match target="pattern"><test qual="any" name="family"><string>SimSun</string></test><edit name="family" mode="assign" binding="same"><string>Noto Serif CJK SC</string></edit></match>'
                    '<match target="pattern"><test qual="any" name="family"><string>微软雅黑</string></test><edit name="family" mode="assign" binding="same"><string>Noto Sans CJK SC</string></edit></match>'
                    '<match target="pattern"><test qual="any" name="family"><string>Microsoft YaHei</string></test><edit name="family" mode="assign" binding="same"><string>Noto Sans CJK SC</string></edit></match>'
                    '<match target="pattern"><test qual="any" name="family"><string>楷体</string></test><edit name="family" mode="assign" binding="same"><string>Noto Serif CJK SC</string></edit></match>'
                    '<match target="pattern"><test qual="any" name="family"><string>KaiTi</string></test><edit name="family" mode="assign" binding="same"><string>Noto Serif CJK SC</string></edit></match>'
                    '<match target="pattern"><test qual="any" name="family"><string>黑体</string></test><edit name="family" mode="assign" binding="same"><string>Noto Sans CJK SC</string></edit></match>'
                    '<match target="pattern"><test qual="any" name="family"><string>SimHei</string></test><edit name="family" mode="assign" binding="same"><string>Noto Sans CJK SC</string></edit></match>'
                    "</fontconfig>"
                )
                with open(fc_conf, "w", encoding="utf-8") as f:
                    f.write(conf_str)
    except Exception as exc:
        logger.warning(f"[ensure_libreoffice_font_config] exception: {exc}")


def _patch_docx_fonts(docx_path: str) -> None:
    """直接修改 docx 内部 XML 中的字体声明，将 Windows 中文字体名替换为系统可用字体。

    LibreOffice headless 模式在 macOS 上不能可靠地使用 registrymodifications.xcu 字体替代，
    因此在转换前直接修补 docx 文件是最可靠的方案。
    """
    import sys
    import zipfile

    # Windows -> macOS/Linux 字体映射
    if sys.platform == "darwin":
        font_map = {
            "宋体": "Songti SC",
            "SimSun": "Songti SC",
            "NSimSun": "Songti SC",
            "黑体": "Heiti SC",
            "SimHei": "Heiti SC",
            "微软雅黑": "PingFang SC",
            "Microsoft YaHei": "PingFang SC",
            "Microsoft YaHei UI": "PingFang SC",
            "楷体": "STKaiti",
            "KaiTi": "STKaiti",
            "仿宋": "STFangsong",
            "FangSong": "STFangsong",
            "汉仪书宋二KW": "Songti SC",
            "汉仪中黑KW": "Heiti SC",
            "苹方-简": "PingFang SC",
            "宋体-简": "Songti SC",
        }
    else:
        font_map = {
            "宋体": "Noto Serif CJK SC",
            "SimSun": "Noto Serif CJK SC",
            "NSimSun": "Noto Serif CJK SC",
            "黑体": "Noto Sans CJK SC",
            "SimHei": "Noto Sans CJK SC",
            "微软雅黑": "Noto Sans CJK SC",
            "Microsoft YaHei": "Noto Sans CJK SC",
            "Microsoft YaHei UI": "Noto Sans CJK SC",
            "楷体": "Noto Serif CJK SC",
            "KaiTi": "Noto Serif CJK SC",
            "仿宋": "Noto Serif CJK SC",
            "FangSong": "Noto Serif CJK SC",
            "汉仪书宋二KW": "Noto Serif CJK SC",
            "汉仪中黑KW": "Noto Sans CJK SC",
        }

    if not font_map:
        return

    xml_parts = [
        "word/document.xml",
        "word/styles.xml",
        "word/fontTable.xml",
        "word/header1.xml",
        "word/header2.xml",
        "word/header3.xml",
        "word/footer1.xml",
        "word/footer2.xml",
        "word/footer3.xml",
        "word/numbering.xml",
    ]

    try:
        import shutil

        tmp_path = docx_path + ".tmp"
        with zipfile.ZipFile(docx_path, "r") as zin, zipfile.ZipFile(tmp_path, "w") as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename in xml_parts:
                    text = data.decode("utf-8")
                    for src_font, dst_font in font_map.items():
                        text = text.replace(f'"{src_font}"', f'"{dst_font}"')
                        text = text.replace(f">{src_font}<", f">{dst_font}<")
                    data = text.encode("utf-8")
                zout.writestr(item, data)
        shutil.move(tmp_path, docx_path)
    except Exception:
        # 非 docx 格式(如 .doc)则跳过
        if os.path.exists(docx_path + ".tmp"):
            os.remove(docx_path + ".tmp")


def _materialize_ole_equations(docx_path: str) -> None:
    """将文档中带预览图的 OLE 对象（如 MathType 公式 Equation.DSMT4）替换为标准 DrawingML 行内图片。

    LibreOffice headless（尤其 macOS gen VCL 后端）无法渲染 MathType OLE 公式，也不会回退
    显示 <v:imagedata> 中的 WMF 预览，导致 PDF 中公式区域整体空白。Word/WPS 显示 OLE 对象
    时用的本就是该预览图，因此直接物化为引用同一 WMF 的行内图片，视觉上无损。
    """
    import re
    import shutil
    import zipfile

    from src.utils import logger

    object_pattern = re.compile(r"<w:object\b[^>]*>.*?</w:object>", re.S)
    imagedata_rid_pattern = re.compile(r"<v:imagedata[^>]*r:id=\"(rId\d+)\"")
    style_pattern = re.compile(r"style=\"([^\"]*)\"")
    width_pattern = re.compile(r"width:([\d.]+)pt")
    height_pattern = re.compile(r"height:([\d.]+)pt")

    # 从高位开始分配 docPr id，避免与文档中已有图片 id 冲突
    next_id = 1_000_000

    def build_inline_drawing(obj_xml: str) -> str | None:
        nonlocal next_id

        rid_match = imagedata_rid_pattern.search(obj_xml)
        if rid_match is None:
            return None  # 无预览图，保留原 OLE 对象

        style_match = style_pattern.search(obj_xml)
        style = style_match.group(1) if style_match else ""
        width_match = width_pattern.search(style)
        height_match = height_pattern.search(style)
        if width_match is None or height_match is None:
            return None  # 缺少尺寸信息，保留原 OLE 对象

        # 1pt = 12700 EMU
        cx = int(float(width_match.group(1)) * 12700)
        cy = int(float(height_match.group(1)) * 12700)
        rid = rid_match.group(1)
        doc_id = next_id
        next_id += 1

        return (
            "<w:drawing>"
            f'<wp:inline distT="0" distB="0" distL="0" distR="0">'
            f'<wp:extent cx="{cx}" cy="{cy}"/>'
            '<wp:effectExtent l="0" t="0" r="0" b="0"/>'
            f'<wp:docPr id="{doc_id}" name="Equation {doc_id}"/>'
            "<wp:cNvGraphicFramePr>"
            '<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
            ' noChangeAspect="1"/>'
            "</wp:cNvGraphicFramePr>"
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            "<pic:nvPicPr>"
            f'<pic:cNvPr id="{doc_id}" name="Equation {doc_id}"/>'
            '<pic:cNvPicPr><a:picLocks noChangeAspect="1"/></pic:cNvPicPr>'
            "</pic:nvPicPr>"
            "<pic:blipFill>"
            f'<a:blip r:embed="{rid}"/>'
            "<a:stretch><a:fillRect/></a:stretch>"
            "</pic:blipFill>"
            "<pic:spPr>"
            '<a:xfrm><a:off x="0" y="0"/>'
            f'<a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
            "</pic:spPr>"
            "</pic:pic>"
            "</a:graphicData></a:graphic>"
            "</wp:inline></w:drawing>"
        )

    tmp_path = docx_path + ".ole.tmp"
    try:
        materialized = 0
        with zipfile.ZipFile(docx_path, "r") as zin, zipfile.ZipFile(tmp_path, "w") as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == "word/document.xml":
                    text = data.decode("utf-8")

                    def replace_object(match: re.Match) -> str:
                        nonlocal materialized
                        drawing = build_inline_drawing(match.group(0))
                        if drawing is None:
                            return match.group(0)
                        materialized += 1
                        return drawing

                    data = object_pattern.sub(replace_object, text).encode("utf-8")
                zout.writestr(item, data)

        if materialized > 0:
            shutil.move(tmp_path, docx_path)
            logger.info(f"[_materialize_ole_equations] materialized {materialized} OLE object(s) as inline images")
        else:
            os.remove(tmp_path)
    except Exception:
        # 预处理失败不应阻断转换，保留原始 docx 交给 LibreOffice
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def convert_doc_to_pdf(doc_bytes: bytes, filename: str) -> bytes | None:
    """使用 soffice / libreoffice 将 doc/docx 文件转换为 PDF bytes"""
    import shutil
    import subprocess
    import tempfile

    from src.utils import logger

    cmd = shutil.which("soffice") or shutil.which("libreoffice")
    if not cmd:
        logger.warning("[convert_doc_to_pdf] soffice/libreoffice CLI not found in environment.")
        return None

    ensure_libreoffice_font_config()

    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            input_path = os.path.join(tmp_dir, filename)
            with open(input_path, "wb") as f:
                f.write(doc_bytes)

            # 对 docx 文件修补字体声明（.doc 格式会跳过）
            if filename.lower().endswith(".docx"):
                _patch_docx_fonts(input_path)
                # 将 MathType 等 OLE 公式物化为预览图片，避免 headless 转换时公式区域空白
                _materialize_ole_equations(input_path)

            lo_profile = os.path.join(tmp_dir, "_lo_profile")
            os.makedirs(lo_profile, exist_ok=True)

            # macOS 的 Quartz VCL 后端在 headless 模式下不使用 fontconfig，
            # 导致找不到 CJK 字体。强制使用 gen (generic/cairo) 后端以启用 fontconfig。
            import sys

            env = os.environ.copy()
            if sys.platform == "darwin":
                env["SAL_USE_VCLPLUGIN"] = "gen"

            res = subprocess.run(
                [
                    cmd,
                    "--headless",
                    "--norestore",
                    f"-env:UserInstallation=file://{lo_profile}",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    tmp_dir,
                    input_path,
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=120,
                env=env,
            )
            if res.returncode != 0:
                logger.warning(f"[convert_doc_to_pdf] conversion failed: {res.stderr.decode('utf-8', errors='ignore')}")
                return None

            base, _ = os.path.splitext(filename)
            pdf_path = os.path.join(tmp_dir, f"{base}.pdf")
            if not os.path.exists(pdf_path):
                logger.warning(f"[convert_doc_to_pdf] output pdf not found: {pdf_path}")
                return None

            with open(pdf_path, "rb") as f:
                return f.read()
    except Exception as e:
        logger.warning(f"[convert_doc_to_pdf] exception occurred: {e}")
    return None
