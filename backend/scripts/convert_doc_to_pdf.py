# -*- coding: utf-8 -*-
"""
@File    : convert_doc_to_pdf.py
@Description : Word (.doc / .docx) 转 PDF 独立验证脚本
@Usage   : python scripts/eduvideo/convert_doc_to_pdf.py <input_doc_path> [output_pdf_path]
"""

import os
import sys

# 将 backend 根目录加入 sys.path 以便导入 src
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.tasks.utils import convert_doc_to_pdf


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/eduvideo/convert_doc_to_pdf.py <input_doc_path> [output_pdf_path]")
        sys.exit(1)

    input_path = os.path.abspath(sys.argv[1])
    if not os.path.exists(input_path):
        print(f"Error: Input file '{input_path}' does not exist.")
        sys.exit(1)

    if len(sys.argv) >= 3:
        output_path = os.path.abspath(sys.argv[2])
    else:
        base, _ = os.path.splitext(input_path)
        output_path = f"{base}.pdf"

    print(f"📄 读取输入文档: {input_path}")
    with open(input_path, "rb") as f:
        doc_bytes = f.read()

    filename = os.path.basename(input_path)
    print("⚙️ 正在调用 LibreOffice 进行 PDF 转换...")

    pdf_bytes = convert_doc_to_pdf(doc_bytes, filename)
    if not pdf_bytes:
        print("❌ 转换失败: convert_doc_to_pdf 返回 None (请检查 LibreOffice/soffice 是否安装或可用)")
        sys.exit(1)

    with open(output_path, "wb") as f:
        f.write(pdf_bytes)

    print(f"✅ 转换成功！输出文件已保存至: {output_path} ({len(pdf_bytes)} bytes)")


if __name__ == "__main__":
    main()
