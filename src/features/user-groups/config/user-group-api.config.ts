import { isMockApiEnabledFromEnv } from "@/shared/config/mock-api.util";

/** Real user-group API by default. Set NEXT_PUBLIC_USER_GROUP_USE_MOCK=true to force mock. */
export function isUserGroupMockApiEnabled(): boolean {
  return isMockApiEnabledFromEnv("NEXT_PUBLIC_USER_GROUP_USE_MOCK", false);
}
