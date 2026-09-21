import type { KioskOption, KioskQuestion, LookupOptionType } from "../types/kiosk.types";

type LookupItem = {
  item?: number | string;
  id?: number | string;
  item_name?: string | null;
  name?: string | null;
  abbreviation?: string | null;
  selling_price?: number | string | null;
};

export function buildLookupOptions(
  items: LookupItem[],
  groupId: string | number,
  presentation: LookupOptionType = "radio",
): KioskOption[] {
  const options: KioskOption[] = [];
  for (const item of items) {
    const itemId = item.item ?? item.id;
    if (itemId == null) continue;
    const id = String(itemId);
    options.push({
      o_id: `lookup_${groupId}_${id}`,
      id: itemId,
      field_type: presentation,
      label: item.item_name || item.name || item.abbreviation || `Item ${id}`,
      value: itemId,
      api_name: id,
      image: null,
      price: item.selling_price ?? "",
      subLabel: "Select the item to add",
      required: false,
    });
  }
  return options;
}

export function getQuestionOptions(question: KioskQuestion): KioskOption[] {
  return [
    ...(question.options || []),
    ...(question.groups || []).flatMap((group) => group.options || []),
  ];
}