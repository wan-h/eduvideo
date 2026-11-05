/**
 * 应用错误基类
 *
 * 所有自定义错误的基类，提供统一的 code 和 cause 支持。
 */
export class AppError extends Error {
  readonly code?: number | string

  constructor(message: string, code?: number | string, options?: ErrorOptions) {
    super(message, options)
    this.name = "AppError"
    this.code = code
  }
}

export class FilmVideoError extends AppError {
  declare readonly code: "format" | "size" | "upload"

  constructor(message: string, code: "format" | "size" | "upload") {
    super(message, code)
    this.name = "FilmVideoError"
  }
}
