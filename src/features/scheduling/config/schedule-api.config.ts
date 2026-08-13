import { isMockApiEnabledFromEnv } from "@/shared/config/mock-api.util";

/**
 * Schedule API mode — mock only for scheduling until the backend is ready.
 * Set NEXT_PUBLIC_SCHEDULE_USE_MOCK=false in env when the real API is available.
 */
export function isScheduleMockApiEnabled(): boolean {
  return isMockApiEnabledFromEnv("NEXT_PUBLIC_SCHEDULE_USE_MOCK", true);
}
