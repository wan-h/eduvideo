/**
 * 后端 API 接口根据 Accept-Language 请求头直接返回多语言数据，
 * 前端无需对后端返回的数据字符串进行二次翻译与替换。
 */

export const voiceLabelByType: Record<string, string> = {}
export const shareVideoTitleZhToEn: Record<string, string> = {}

export function translateShareVideoTitle(title: string): string {
  return title
}
