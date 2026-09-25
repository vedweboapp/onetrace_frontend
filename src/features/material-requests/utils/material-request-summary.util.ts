import type {
  MaterialRequestItemRef,
  MaterialRequestItemSummary,
} from "@/features/material-requests/types/material-request.types";
import { aggregateMaterialRequestItems } from "@/features/material-requests/utils/material-request-item-aggregate.util";

/** Build API-facing item summaries (mock / backend). UI should consume these directly. */
export function buildMaterialRequestItemSummaries(
  items: MaterialRequestItemRef[] | undefined,
): MaterialRequestItemSummary[] {
  return aggregateMaterialRequestItems(items).map((row) => ({
    group_key: row.key,
    item_id: row.itemId,
    item_name: row.materialName,
    group_name: row.groupName !== "—" ? row.groupName : null,
    requested_quantity: row.requested,
    dispatched_quantity: row.dispatched,
    fulfilled_quantity: row.fulfilled,
    surplus_quantity: row.surplus,
    pending_quantity: row.pending,
    restocked_quantity: row.restocked,
    default_dispatch_quantity: row.pending > 0 ? row.pending : 0,
  }));
}
