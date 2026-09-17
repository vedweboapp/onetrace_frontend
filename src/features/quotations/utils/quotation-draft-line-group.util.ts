import type { QuotationDraftLine } from "@/features/quotations/types/quotation-draft.types";
import type { QuotationQuoteSectionPin } from "@/features/quotations/types/quotation.types";

type GroupNameLookup = {
  groups?: Array<{ id: number; name?: string | null }>;
  optionLabelById?: Record<string, string>;
};

/** Resolve selected group id/name from the add-row group picker. */
export function resolveQuotationDraftLineGroup(
  groupId: string,
  lookup: GroupNameLookup = {},
): Pick<QuotationDraftLine, "group_id" | "group_name"> {
  const trimmed = groupId.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return { group_id: null, group_name: null };
  }
  const id = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return { group_id: null, group_name: null };
  }
  const fromGroups = lookup.groups?.find((g) => g.id === id)?.name?.trim();
  const fromOptions = lookup.optionLabelById?.[trimmed]?.trim();
  const name = fromGroups || fromOptions || null;
  return { group_id: id, group_name: name };
}

export function quotationDraftLineGroupPayload(
  line: Pick<QuotationDraftLine, "group_id" | "group_name">,
): Pick<QuotationQuoteSectionPin, "group_id" | "group_name"> {
  const groupId =
    typeof line.group_id === "number" && Number.isFinite(line.group_id) && line.group_id > 0
      ? line.group_id
      : null;
  const groupName = typeof line.group_name === "string" && line.group_name.trim() ? line.group_name.trim() : null;
  if (groupId == null) {
    return { group_id: null, group_name: null };
  }
  return { group_id: groupId, group_name: groupName };
}
