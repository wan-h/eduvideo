export interface UploadPresignedUrlParams {
  file_name: string
  content_type?: string
  tag?: string
}

export interface UploadPresignedUrlResult {
  upload_url: string
  public_url: string
  content_type: string
}
