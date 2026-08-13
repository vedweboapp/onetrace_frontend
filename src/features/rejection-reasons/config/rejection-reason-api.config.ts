import { isMockApiEnabledFromEnv } from "@/shared/config/mock-api.util";

/** Set NEXT_PUBLIC_REJECTION_REASON_USE_MOCK=false when the real API is available. */
export function isRejectionReasonMockApiEnabled(): boolean {
  return isMockApiEnabledFromEnv("NEXT_PUBLIC_REJECTION_REASON_USE_MOCK", true);
}
