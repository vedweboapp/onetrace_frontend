export class ApiBusinessError extends Error {
  readonly errorCode: string | null;
  readonly errors: unknown;

  constructor(
    message: string,
    options?: { errorCode?: string | null; errors?: unknown },
  ) {
    super(message);
    this.name = "ApiBusinessError";
    this.errorCode = options?.errorCode ?? null;
    this.errors = options?.errors ?? null;
  }
}

export function isApiBusinessError(value: unknown): value is ApiBusinessError {
  return value instanceof ApiBusinessError;
}
