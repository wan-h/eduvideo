# render-video.ts 使用指南

通过 JSON 数据文件驱动 Remotion 视频渲染的 CLI 脚本。

---

## 0. 环境要求与首次准备

| 依赖     | 最低版本 | 说明                                |
| :------- | :------- | :---------------------------------- |
| Node.js  | >= 22    | 运行时                              |
| pnpm     | >= 10    | 包管理器（项目使用 monorepo）       |
| Chromium | 自动安装 | Remotion 渲染引擎，首次运行自动下载 |

**首次使用前，必须在根目录安装依赖并构建 shared 包：**

```bash
cd frontend
pnpm install
pnpm --filter @ask2vid/shared build
```

脚本依赖 `@ask2vid/shared` 的类型和数据转换函数，shared 包必须先编译产出 `dist/`，否则脚本运行时会报模块解析错误。

---

## 1. 快速开始

### 1.1 准备 JSON 数据文件

脚本接收 `RawVideoData` 格式的 JSON 文件，**不含 `video_settings`**。渲染参数（分辨率、帧率等）由 CLI 参数或默认值提供。

最小可运行示例（无音频）：

```json
{
  "question_metadata": {
    "title": "测试题目",
    "type": "choice_question",
    "level": "easy",
    "subject": "math",
    "knowledge_points": ["加法"],
    "voice": "",
    "language": "chinese"
  },
  "question_content": {
    "stem": "1+1 等于几？",
    "options": ["1", "2", "3", "4"]
  },
  "scenes": {
    "question_introduction": {
      "stem": "1+1 等于几？",
      "options": ["1", "2", "3", "4"],
      "subtitles": []
    },
    "question_solution": {
      "segments": [
        {
          "title": "解答",
          "content": "1+1 等于 2。",
          "subtitles": []
        }
      ]
    },
    "question_key_points": {
      "segments": [
        {
          "title": "要点",
          "content": "加法是将两个数合并的运算。",
          "subtitles": []
        }
      ]
    }
  }
}
```

> **注意**：`question_metadata` 中 `voice` 和 `language` 是可选字段。`voice` 默认为空字符串，`language` 默认为 `"chinese"`。

> **JSON 中文引号注意**：如果文本内容中包含中文引号（如 `"三线合一"`），JSON 标准不允许直接使用双引号，必须替换为中文弯引号 `""`（U+201C/U+201D）。

### 1.2 运行

在项目根目录执行：

```bash
pnpm render:video --input ./server/scripts/mock-data.json --output ./renders/output.mp4
```

---

## 2. 命令行参数

| 参数                 | 类型      | 默认值            | 说明                                                                     |
| :------------------- | :-------- | :---------------- | :----------------------------------------------------------------------- |
| `--input`            | `string`  | **必填**          | JSON 数据文件路径                                                        |
| `--output`           | `string`  | **必填**          | 输出文件路径。父目录不存在时自动创建                                     |
| `--concurrency`      | `number`  | Remotion 默认值   | 同时渲染的帧数。推荐值：4-8                                              |
| `--width`            | `number`  | `1920`            | 视频宽度（像素），正整数                                                 |
| `--height`           | `number`  | `1080`            | 视频高度（像素），正整数                                                 |
| `--fps`              | `number`  | `30`              | 视频帧率，正整数                                                         |
| `--background`       | `string`  | `default`         | 背景样式，可选：`default`、`blackboard2`、`gray` 或 `https?://` 图片 URL |
| `--opening-film`     | `string`  | `""`              | 片头影片 URL 或路径                                                      |
| `--closing-film`     | `string`  | `""`              | 片尾影片 URL 或路径                                                      |
| `--watermark`        | `string`  | `""`              | 水印文本                                                                 |
| `--bundle-cache-dir` | `string`  | `bundles/default` | Webpack 打包缓存目录                                                     |
| `--json`             | `boolean` | `false`           | 以 JSON 行格式输出进度（供后端程序解析）                                 |
| `--quiet`            | `boolean` | `false`           | 静默模式，不输出进度信息                                                 |

### 2.1 进度输出格式

**默认模式**（`--json` 和 `--quiet` 均未设置）：

```
Input:  /path/to/data.json
Output: /path/to/output.mp4
Settings: 1920x1080 @ 30fps, background=default
[bundling]
[selecting]
[rendering]
  Progress: 100%

耗时汇总 [cli-render]
---
bundle:   1%  1.0s
select:   0%  674ms
render:  99%  2m23s
---
total: 2m24s

Done: /path/to/output.mp4
```

**JSON 模式**（`--json`）：

每行一个 JSON 对象，`phase` 取值 `bundling | selecting | rendering | completed`：

```json
{"phase":"bundling","progress":0,"timestamp":1717332000000}
{"phase":"selecting","progress":0,"timestamp":1717332001000}
{"phase":"rendering","progress":0,"timestamp":1717332002000}
{"phase":"rendering","progress":0.05,"timestamp":1717332005000}
{"phase":"rendering","progress":0.5,"timestamp":1717332060000}
{"phase":"rendering","progress":0.99,"timestamp":1717332120000}
{"phase":"completed","progress":1,"timestamp":1717332125000}
```

---

## 2.2 渲染阶段说明

| 阶段        | 含义         | 主要工作                                                   | 典型耗时 |
| :---------- | :----------- | :--------------------------------------------------------- | :------- |
| `bundling`  | Webpack 打包 | 将 `@ask2vid/shared` 的 Remotion 组件打包为可渲染的 bundle | 0.5-3s   |
| `selecting` | 选择合成配置 | 解析 `VideoComposition` 组件，获取帧数、分辨率等元数据     | 0.3-1s   |
| `rendering` | 逐帧渲染     | Chromium 逐帧截图 + ffmpeg 编码为 MP4                      | 1-5min   |
| `completed` | 渲染完成     | 输出最终 MP4 文件                                          | -        |

### 阶段详解

**`bundling`（打包阶段）**

- 调用 `@remotion/bundler` 的 `bundle()` 函数
- 入口文件：`shared/src/Root.tsx`
- 输出：Webpack 打包产物（缓存在 `bundles/default/`）
- 首次运行较慢，后续有缓存命中

**`selecting`（选择阶段）**

- 调用 `@remotion/renderer` 的 `selectComposition()`
- 启动 Chromium 访问打包产物
- 解析 `<Composition>` 组件获取：`durationInFrames`、`fps`、`width`、`height`
- 校验输入数据格式

**`rendering`（渲染阶段）**

- 调用 `@remotion/renderer` 的 `renderMedia()`
- 根据 `concurrency` 参数并行渲染多帧
- 每帧：Chromium 截图 → 图片序列 → ffmpeg 编码为 H.264
- 进度回调：`onProgress({ progress, encodedFrames, doneIn })`

**队列服务额外阶段**（仅 API 模式）

| 阶段      | 含义     | 主要工作                               |
| :-------- | :------- | :------------------------------------- |
| `prepare` | 数据准备 | 解析 JSON、校验 schema、转换为 FE 数据 |
| `upload`  | 上传存储 | 将 MP4 上传到 S3 兼容存储              |

---

## 3. 使用示例

```bash
# 基础用法（根目录执行）
pnpm render:video --input ./data.json --output ./out/video.mp4

# 指定输出 + 8 帧并发
pnpm render:video --input ./data.json --output ./out/video.mp4 --concurrency 8

# 720p 分辨率 + JSON 进度输出
pnpm render:video --input ./data.json --output ./out/video.mp4 --width 1280 --height 720 --json

# 黑板背景 + 24fps
pnpm render:video --input ./data.json --output ./out/video.mp4 --background blackboard2 --fps 24

# 静默模式（仅 stderr 报错）
pnpm render:video --input ./data.json --output ./out/video.mp4 --quiet
```

---

## 4. 常见问题

### shared 包模块找不到

```
Cannot find module '@ask2vid/shared'
```

未构建 shared 包。执行：

```bash
pnpm --filter @ask2vid/shared build
```

### 音频下载失败

```
Error while downloading http://.../xxx.mp3: Error: socket hang up
```

外部 CDN 偶发断连。解决方法：

- 重试（网络问题通常是临时的）
- 检查音频 URL 是否可公网访问
- 如无音频需求，移除 `subtitles` 中 `audio` 字段或设为 `""`

### 渲染速度慢

- 增加 `--concurrency`（4-8 为推荐范围，过高可能导致 Chromium OOM）
- 首次渲染会下载 Chromium（约 300MB），后续渲染复用

### Chromium 找不到

Remotion 首次运行自动下载 Chromium 到缓存目录。若下载失败：

- 检查网络是否可访问 `https://storage.googleapis.com`
- 设置环境变量 `PUPPETEER_SKIP_DOWNLOAD=1` 使用系统 Chrome

### JSON 中文引号导致解析失败

```
SyntaxError: Expected ',' or '}' after property value in JSON
```

JSON 标准要求字符串值内的双引号必须转义。中文引号 `"..."` 应替换为弯引号 `"..."`（U+201C/U+201D）。

**快速检查**：

```bash
python3 -c "import json; json.load(open('server/scripts/mock-data.json'))"
```

---

## 5. 数据格式说明

### 顶层结构

```json
{
  "question_metadata": { ... },   // 题目元信息
  "question_content": { ... },    // 题干内容
  "scenes": {                     // 场景（视频分镜）
    "question_introduction": { ... },  // 读题场景
    "question_solution": { ... },      // 解答场景
    "question_key_points": { ... }     // 总结场景
  }
}
```

### question_metadata 字段

| 字段               | 类型     | 必填 | 说明                              |
| :----------------- | :------- | :--- | :-------------------------------- |
| `title`            | `string` | 是   | 题目名称                          |
| `type`             | `string` | 是   | 题目类型，如 `answer_question`    |
| `level`            | `string` | 是   | 难度，如 `easy`、`medium`、`hard` |
| `subject`          | `string` | 是   | 学科，如 `math`、`physics`        |
| `knowledge_points` | `array`  | 是   | 知识点列表                        |
| `voice`            | `string` | 否   | 语音 ID，默认为 `""`              |
| `language`         | `string` | 否   | 语言，默认为 `"chinese"`          |

### 字幕 (subtitle) 结构

```json
{
  "text": "字幕文本",
  "audio": "https://...mp3",
  "duration": 5062
}
```

- `text`：字幕文本（必填）
- `audio`：音频文件 URL（可为空字符串）
- `duration`：音频时长，单位毫秒（必填，`>= 0`）

### mock-data.json 参考

`server/scripts/mock-data.json` 是一个完整的示例数据：

| 属性       | 值                     |
| :--------- | :--------------------- |
| 学科       | math                   |
| 类型       | answer_question        |
| 难度       | hard                   |
| 字幕总数   | 34                     |
| 音频总时长 | ~200 秒（约 3.3 分钟） |
