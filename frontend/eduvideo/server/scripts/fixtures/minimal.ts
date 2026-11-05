#!/usr/bin/env node
/**
 * 测试用 JSON fixture — 最小可渲染的视频数据
 */
const fixture = {
  question_metadata: {
    title: "Test Math Question",
    type: "math",
    level: "easy",
    subject: "math",
    stage: "senior",
    knowledge_points: ["addition"],
    video_synthesis_template_id: "tpl_001",
  },
  question_content: {
    stem: "What is 1+1?",
    options: ["1", "2", "3", "4"],
  },
  scenes: {
    question_introduction: {
      stem: "What is 1+1?",
      options: ["1", "2", "3", "4"],
      subtitles: [],
    },
    question_solution: {
      segments: [
        {
          title: "Solution",
          content: "1+1 equals 2.",
          subtitles: [],
        },
      ],
    },
    question_key_points: {
      segments: [
        {
          title: "Key Point",
          content: "Addition is combining two numbers.",
          subtitles: [],
        },
      ],
    },
  },
}

// 当作为脚本直接运行时输出 JSON
if (import.meta.url.endsWith(process.argv[1]?.split("/").pop() ?? "")) {
  process.stdout.write(JSON.stringify(fixture, null, 2) + "\n")
}

export default fixture
