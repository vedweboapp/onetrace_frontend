import type { DispatchLineItem, DispatchLineSummary } from "@/features/dispatches/types/dispatch.types";
import { aggregateDispatchDetailLines } from "@/features/dispatches/utils/dispatch-line-aggregate.util";

/** Build API-facing line summaries (mock / backend). UI should consume these directly. */
export function buildDispatchLineSummaries(lines: DispatchLineItem[]): DispatchLineSummary[] {
  return aggregateDispatchDetailLines(lines).map((row) => ({
    group_key: row.key,
    item_id: row.itemId,
    item_name: row.itemName,
    is_extra: row.isExtra,
    requested_quantity: row.requested,
    pending_quantity: row.pending,
    dispatched_quantity: row.dispatched,
    fulfilled_quantity: row.fulfilled,
    surplus_quantity: row.surplus,
    restocked_quantity: row.restocked,
  }));
}
