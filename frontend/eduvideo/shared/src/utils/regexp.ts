/** 匹配 Unicode 格式控制字符（零宽空格、零宽连接符、BOM 等），用于判断字符串是否实质为空 */
export const ZERO_WIDTH_PATTERN = /\p{Cf}/gu
