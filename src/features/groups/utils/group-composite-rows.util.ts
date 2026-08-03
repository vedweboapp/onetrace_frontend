import type { GroupItemRef } from "@/features/groups/types/group.types";

export const GROUP_ABBREVIATION_MAX_LENGTH = 50;

export type GroupCompositeRowInput = {
  id: string;
  item: string;
  abbreviation: string;
};

export type GroupCompositeRowError = {
  item?: string;
  abbreviation?: string;
};

export type GroupCompositeValidationMessages = {
  compositeItemRequired: string;
  abbreviationRequired: string;
  abbreviationMaxLength: string;
  duplicateCompositeItem: string;
};

function toNumberOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Normalize abbreviation input: uppercase + hard max length. */
export function normalizeGroupAbbreviation(raw: string): string {
  return raw.toUpperCase().slice(0, GROUP_ABBREVIATION_MAX_LENGTH);
}

/**
 * Validates group composite rows.
 * Empty rows are skipped. Partial rows and duplicates get per-field errors.
 */
export function validateGroupCompositeRows(
  rows: GroupCompositeRowInput[],
  messages: GroupCompositeValidationMessages,
): {
  items: GroupItemRef[] | null;
  errors: Record<string, GroupCompositeRowError>;
} {
  const errors: Record<string, GroupCompositeRowError> = {};
  const out: GroupItemRef[] = [];
  const seen = new Set<number>();

  for (const row of rows) {
    const id = toNumberOrNull(row.item);
    const abbreviation = row.abbreviation.trim();
    const emptyRow = id == null && abbreviation.length === 0;
    if (emptyRow) continue;

    const rowError: GroupCompositeRowError = {};
    if (id == null) rowError.item = messages.compositeItemRequired;
    if (abbreviation.length === 0) {
      rowError.abbreviation = messages.abbreviationRequired;
    } else if (abbreviation.length > GROUP_ABBREVIATION_MAX_LENGTH) {
      rowError.abbreviation = messages.abbreviationMaxLength;
    }

    if (id != null) {
      if (seen.has(id)) {
        rowError.item = messages.duplicateCompositeItem;
      } else {
        seen.add(id);
      }
    }

    if (rowError.item || rowError.abbreviation) {
      errors[row.id] = rowError;
      continue;
    }

    out.push({ item: id as number, abbreviation });
  }

  return {
    items: Object.keys(errors).length > 0 ? null : out,
    errors,
  };
}
