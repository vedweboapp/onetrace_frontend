import type { ChecklistType } from "@/features/checklist-types/types/checklist-type.types";

export function sequenceForListIndex(index: number, page: number, pageSize: number): number {
  return (page - 1) * pageSize + index + 1;
}

export function applySequencesToItems(
  items: ChecklistType[],
  page: number,
  pageSize: number,
): ChecklistType[] {
  return items.map((item, index) => ({
    ...item,
    sequence: sequenceForListIndex(index, page, pageSize),
  }));
}

export function checklistSequenceUpdates(
  before: ChecklistType[],
  after: ChecklistType[],
): { id: number; sequence: number }[] {
  const prev = new Map(before.map((item) => [item.id, item.sequence]));
  return after
    .filter((item) => prev.get(item.id) !== item.sequence)
    .map((item) => ({ id: item.id, sequence: item.sequence }));
}
