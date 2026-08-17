import { isMockApiEnabledFromEnv } from "@/shared/config/mock-api.util";

/**
 * Schedule stays on mock until the backend is ready (rejection reason + user group are real).
 * Set NEXT_PUBLIC_SCHEDULE_USE_MOCK=false in env when the real schedule API is available.
 */
export function isScheduleMockApiEnabled(): boolean {
  return isMockApiEnabledFromEnv("NEXT_PUBLIC_SCHEDULE_USE_MOCK", true);
}
