export class ApiBusinessError extends Error {
  readonly errorCode: string | null;
  readonly errors: unknown;
  /** Optional payload from failed envelopes (e.g. DUPLICATE_ENTRY existing row). */
  readonly data: unknown;

  constructor(
    message: string,
    options?: { errorCode?: string | null; errors?: unknown; data?: unknown },
  ) {
    super(message);
    this.name = "ApiBusinessError";
    this.errorCode = options?.errorCode ?? null;
    this.errors = options?.errors ?? null;
    this.data = options?.data ?? null;
  }
}

export function isApiBusinessError(value: unknown): value is ApiBusinessError {
  return value instanceof ApiBusinessError;
}
