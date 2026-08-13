import { isMockApiEnabledFromEnv } from "@/shared/config/mock-api.util";

/** Set NEXT_PUBLIC_USER_GROUP_USE_MOCK=false when the real API is available. */
export function isUserGroupMockApiEnabled(): boolean {
  return isMockApiEnabledFromEnv("NEXT_PUBLIC_USER_GROUP_USE_MOCK", true);
}
