import { ApiBusinessError } from "../errors/api-business-error";

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export function assertApiSuccess<T>(
  envelope: ApiEnvelope<T>,
): asserts envelope is ApiEnvelope<T> & { success: true } {
  if (!envelope.success) {
    const fail = envelope as unknown as {
      message?: string;
      error_code?: string | null;
      errors?: unknown;
    };
    const msg = typeof fail.message === "string" ? fail.message : "Request failed";
    const code = typeof fail.error_code === "string" ? fail.error_code : null;
    throw new ApiBusinessError(msg, { errorCode: code, errors: fail.errors });
  }
}
