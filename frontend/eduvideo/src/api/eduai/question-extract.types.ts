/* ── 题目提取确认 ── */

export type QuestionType = "choice_question" | "answer_question"

export interface QuestionInfo {
  /** 题目截图信息 */
  image: string
  /** 题号；无题号时为 null */
  question_number?: number | null
  /** 题目类型 */
  question_type: QuestionType
  /** 题目完整内容（markdown 格式） */
  content: string
  /** 题目在原文档中的位置框（千分比坐标） */
  bbox?: number[] | Record<string, unknown> | null
}

export interface QuestionExtractConfirmInfo {
  id: string
  script_task_id: string
  extract_question_task_id: string
  status: number
  questions: QuestionInfo[]
  created_at: string
  folder_id: string
}

export interface ConfirmQuestionExtractReq {
  /** ScriptQuestionsExtractConfirm ID */
  confirm_id: string
  /** 用户确认的题目列表 */
  questions: QuestionInfo[]
  /** 文件夹ID */
  folder_id?: string
}

export interface DeleteQuestionExtractConfirmReq {
  /** ScriptQuestionsExtractConfirm ID */
  confirm_id: string
}
