import { eduaiApi } from "@/services/http"
import type { ApiResponse } from "../types"
import type { DisplayInfoDesc, ShareVideoDesc } from "./common.types"

/* ── 首页 ── */

/** GET /eduvideo/v0/common/share_videos — 获取首页分享视频列表 */
export async function getShareVideos(): Promise<ShareVideoDesc[]> {
  const { data } = await eduaiApi
    .get("/eduvideo/v0/common/share_videos")
    .json<ApiResponse<ShareVideoDesc[]>>()
  return data
}

/** GET /eduvideo/v0/common/home_display_info — 获取首页展示信息 */
export async function getHomeDisplayInfo(): Promise<DisplayInfoDesc> {
  const { data } = await eduaiApi
    .get("/eduvideo/v0/common/home_display_info")
    .json<ApiResponse<DisplayInfoDesc>>()
  return data
}
