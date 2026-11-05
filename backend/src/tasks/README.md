# Tasks

## 基础任务
将状态更新等基础任务抽象为任务，便于管理
```bash
python -m src.tasks.base.worker
```

## doc_parse
文档解析任务（支持图片、pdf文档解析为markdown结构化数据）
```bash
python -m src.tasks.doc_parse.worker
```

## readable_tts
文本转语音（支持fish/minimax/kokoro，中文可读、latex可读翻译）
```bash
python -m src.tasks.readable_tts.worker
# 快速，在线编辑等，区别排队任务，优化用户体验
python -m src.tasks.readable_tts.fast_worker
```

## question_explanation_video_gen
问题解答视频生成
* script_gen（生成视频脚本）
```bash
python -m src.tasks.question_explanation_video_gen.script_gen.worker
```
* video_synthesis（视频合成）
```bash
python -m src.tasks.question_explanation_video_gen.video_synthesis.worker
```

## question_extract
问题提取
```bash
python -m src.tasks.question_extract.worker
```

## question_solve
问题解答
```bash
python -m src.tasks.question_solve.worker
```

## question_parse
问题解析(结构化题干、选项等信息)
```bash
python -m src.tasks.question_parse.worker
```