import { isMockApiEnabledFromEnv } from "@/shared/config/mock-api.util";

/** Real rejection-reason API by default. Set NEXT_PUBLIC_REJECTION_REASON_USE_MOCK=true to force mock. */
export function isRejectionReasonMockApiEnabled(): boolean {
  return isMockApiEnabledFromEnv("NEXT_PUBLIC_REJECTION_REASON_USE_MOCK", false);
}
