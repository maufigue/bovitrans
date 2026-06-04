export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function badRequest(message: string, details?: unknown) {
  return new ApiError(400, message, details);
}

export function notFound(message: string) {
  return new ApiError(404, message);
}

export function conflict(message: string, details?: unknown) {
  return new ApiError(409, message, details);
}
