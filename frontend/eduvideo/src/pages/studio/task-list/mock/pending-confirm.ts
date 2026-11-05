import type { QuestionExtractConfirmInfo } from "@/api/eduai/question-extract.types"

const MOCK_QUESTIONS_CHOICE = [
  {
    image: "https://placehold.co/600x400?text=Q1",
    question_number: 1,
    question_type: "choice_question" as const,
    content:
      "下列哪项是光合作用的主要产物？\n\nA. 二氧化碳\nB. 氧气\nC. 氮气\nD. 氢气",
  },
  {
    image: "https://placehold.co/600x400?text=Q2",
    question_number: 2,
    question_type: "choice_question" as const,
    content: "以下哪个不是哺乳动物？\n\nA. 鲸鱼\nB. 蝙蝠\nC. 企鹅\nD. 海豚",
  },
  {
    image: "https://placehold.co/600x400?text=Q3",
    question_number: 3,
    question_type: "choice_question" as const,
    content: "π 的值约等于？\n\nA. 3.14\nB. 2.72\nC. 1.62\nD. 1.41",
  },
]

const MOCK_QUESTIONS_ANSWER = [
  {
    image: "https://placehold.co/600x400?text=Q1",
    question_number: 1,
    question_type: "answer_question" as const,
    content: "请简述牛顿第一定律的内容及其物理意义。",
  },
  {
    image: "https://placehold.co/600x400?text=Q2",
    question_number: 2,
    question_type: "answer_question" as const,
    content: "解方程：$2x^2 - 5x + 2 = 0$，并写出解题步骤。",
  },
]

const MOCK_QUESTIONS_MIXED = [
  {
    image: "https://placehold.co/600x400?text=Q1",
    question_number: 1,
    question_type: "choice_question" as const,
    content:
      "DNA 的全称是什么？\n\nA. Deoxyribonucleic Acid\nB. Ribonucleic Acid\nC. Amino Acid\nD. Fatty Acid",
  },
  {
    image: "https://placehold.co/600x400?text=Q2",
    question_number: 2,
    question_type: "answer_question" as const,
    content: "请解释细胞呼吸的三个阶段及其发生的场所。",
  },
  {
    image: "https://placehold.co/600x400?text=Q3",
    question_number: 3,
    question_type: "choice_question" as const,
    content:
      "下列哪种细胞器负责蛋白质合成？\n\nA. 线粒体\nB. 核糖体\nC. 高尔基体\nD. 溶酶体",
  },
  {
    image: "https://placehold.co/600x400?text=Q4",
    question_number: null,
    question_type: "answer_question" as const,
    content: "画出动物细胞和植物细胞的结构对比图，标注主要差异。",
  },
]

const NOW = new Date()

function ago(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString()
}

export const MOCK_PENDING_CONFIRMS: QuestionExtractConfirmInfo[] = [
  {
    id: "qec-001",
    script_task_id: "task-math-20240620-001",
    extract_question_task_id: "eqt-math-001",
    status: 0,
    questions: MOCK_QUESTIONS_CHOICE,
    created_at: ago(3),
    folder_id: "folder-math",
  },
  {
    id: "qec-002",
    script_task_id: "task-physics-20240620-002",
    extract_question_task_id: "eqt-physics-002",
    status: 0,
    questions: MOCK_QUESTIONS_ANSWER,
    created_at: ago(15),
    folder_id: "folder-physics",
  },
  {
    id: "qec-003",
    script_task_id: "task-biology-20240619-003",
    extract_question_task_id: "eqt-bio-003",
    status: 0,
    questions: MOCK_QUESTIONS_MIXED,
    created_at: ago(45),
    folder_id: "folder-biology",
  },
  {
    id: "qec-004",
    script_task_id: "task-chemistry-20240619-004",
    extract_question_task_id: "eqt-chem-004",
    status: 0,
    questions: [
      {
        image: "https://placehold.co/600x400?text=Q1",
        question_number: 1,
        question_type: "choice_question",
        content: "下列哪种物质是强酸？\n\nA. CH₃COOH\nB. HCl\nC. NH₃\nD. H₂O",
      },
      {
        image: "https://placehold.co/600x400?text=Q2",
        question_number: 2,
        question_type: "choice_question",
        content:
          "pH=7 的溶液呈什么性？\n\nA. 酸性\nB. 碱性\nC. 中性\nD. 无法确定",
      },
      {
        image: "https://placehold.co/600x400?text=Q3",
        question_number: 3,
        question_type: "answer_question",
        content: "配平化学方程式：$Fe + O_2 \\rightarrow Fe_2O_3$",
      },
    ],
    created_at: ago(60),
    folder_id: "folder-chemistry",
  },
  {
    id: "qec-005",
    script_task_id: "task-history-20240618-005",
    extract_question_task_id: "eqt-hist-005",
    status: 0,
    questions: [
      {
        image: "https://placehold.co/600x400?text=Q1",
        question_number: 1,
        question_type: "answer_question",
        content: "简述鸦片战争（1840年）爆发的主要原因及其对中国近代史的影响。",
      },
      {
        image: "https://placehold.co/600x400?text=Q2",
        question_number: 2,
        question_type: "choice_question",
        content:
          "《南京条约》签订于哪一年？\n\nA. 1840年\nB. 1842年\nC. 1844年\nD. 1860年",
      },
    ],
    created_at: ago(120),
    folder_id: "folder-history",
  },
  {
    id: "qec-006",
    script_task_id: "task-english-20240618-006",
    extract_question_task_id: "eqt-eng-006",
    status: 0,
    questions: [
      {
        image: "https://placehold.co/600x400?text=Q1",
        question_number: 1,
        question_type: "choice_question",
        content:
          "Choose the correct answer:\n\nShe _____ to school every day.\n\nA. go\nB. goes\nC. going\nD. gone",
      },
      {
        image: "https://placehold.co/600x400?text=Q2",
        question_number: 2,
        question_type: "choice_question",
        content:
          'The opposite of "hot" is:\n\nA. warm\nB. cold\nC. cool\nD. mild',
      },
      {
        image: "https://placehold.co/600x400?text=Q3",
        question_number: 3,
        question_type: "answer_question",
        content:
          "Write a short paragraph (50-80 words) about your favorite season.",
      },
      {
        image: "https://placehold.co/600x400?text=Q4",
        question_number: null,
        question_type: "choice_question",
        content:
          'Fill in the blank: "I have _____ finished my homework."\n\nA. already\nB. yet\nC. still\nD. just',
      },
    ],
    created_at: ago(180),
    folder_id: "folder-english",
  },
  {
    id: "qec-007",
    script_task_id: "task-geography-20240617-007",
    extract_question_task_id: "eqt-geo-007",
    status: 0,
    questions: MOCK_QUESTIONS_CHOICE,
    created_at: ago(240),
    folder_id: "folder-geography",
  },
  {
    id: "qec-008",
    script_task_id: "task-math-v2-20240617-008",
    extract_question_task_id: "eqt-math-008",
    status: 0,
    questions: [
      {
        image: "https://placehold.co/600x400?text=Q1",
        question_number: 1,
        question_type: "answer_question",
        content: "求函数 $f(x) = x^3 - 3x^2 + 2$ 的极值点及极值。",
      },
      {
        image: "https://placehold.co/600x400?text=Q2",
        question_number: 2,
        question_type: "answer_question",
        content: "计算定积分：$\\int_0^1 (x^2 + 2x) \\, dx$",
      },
    ],
    created_at: ago(300),
    folder_id: "folder-math",
  },
]

/** 从 script_task_id 提取可读名称 */
export function deriveTaskName(task: QuestionExtractConfirmInfo): string {
  const parts = task.script_task_id.split("-")
  const subjectMap: Record<string, string> = {
    math: "数学试卷",
    physics: "物理试卷",
    biology: "生物试卷",
    chemistry: "化学试卷",
    history: "历史试卷",
    english: "英语试卷",
    geography: "地理试卷",
  }
  const subject = parts[1] ?? "未知"
  return subjectMap[subject] ?? `${subject} 试卷`
}

/** 统计题目类型 */
export function countQuestionTypes(
  questions: QuestionExtractConfirmInfo["questions"]
) {
  const choice = questions.filter(
    (q) => q.question_type === "choice_question"
  ).length
  const answer = questions.filter(
    (q) => q.question_type === "answer_question"
  ).length
  return { choice, answer }
}
