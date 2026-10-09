export class GettyApiError extends Error {
  constructor(
    message: string,
    public status = 502,
    public details?: unknown
  ) {
    super(message)
  }
}
