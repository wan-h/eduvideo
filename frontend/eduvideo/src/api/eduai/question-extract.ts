import { eduaiApi } from "@/services/http"
import type { ApiResponse } from "../types"
import type {
  ConfirmQuestionExtractReq,
  DeleteQuestionExtractConfirmReq,
  QuestionExtractConfirmInfo,
} from "./question-extract.types"

/* ── 题目提取确认 ── */

/** 获取待确认题目列表 */
export async function listQuestionExtracts(): Promise<
  QuestionExtractConfirmInfo[]
> {
  const { data } = await eduaiApi
    .get("/eduvideo/v0/question_extract")
    .json<ApiResponse<QuestionExtractConfirmInfo[]>>()
  return data
}

/** 确认题目提取 */
export async function confirmQuestionExtract(
  req: ConfirmQuestionExtractReq
): Promise<void> {
  await eduaiApi
    .put("/eduvideo/v0/question_extract", {
      json: req,
    })
    .json<ApiResponse<null>>()
}

/** 删除待确认题目 */
export async function deleteQuestionExtract(
  req: DeleteQuestionExtractConfirmReq
): Promise<void> {
  await eduaiApi
    .delete("/eduvideo/v0/question_extract", {
      json: req,
    })
    .json<ApiResponse<null>>()
}
