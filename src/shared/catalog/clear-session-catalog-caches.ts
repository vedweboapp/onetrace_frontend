import { invalidateDispatchUserLabelCache } from "@/features/dispatches/utils/dispatch-enrich.util";
import { invalidateSchedulingCatalog } from "@/features/scheduling/hooks/use-scheduling-catalog";
import { invalidateUsersByRoleCache } from "@/features/users/utils/load-users-by-role.util";
import { useTabLayoutsStore } from "@/shared/store/tab-layouts.store";

/**
 * Drops in-memory dropdown caches when the signed-in user / org changes.
 * Call before login session write and on logout so Account B never sees Account A lists.
 */
export function clearSessionCatalogCaches(): void {
  invalidateUsersByRoleCache();
  invalidateSchedulingCatalog();
  invalidateDispatchUserLabelCache();
  useTabLayoutsStore.getState().clearLayouts();
}
