import type { KioskOption, KioskQuestion, LookupOptionType } from "../types/kiosk.types";

type LookupItem = {
  item?: number | string;
  id?: number | string;
  item_name?: string | null;
  name?: string | null;
  abbreviation?: string | null;
  selling_price?: number | string | null;
  composite_item_id?: number | string | null;
};

function resolveLookupImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function buildLookupOptions(
  items: LookupItem[],
  groupId: string | number,
  presentation: LookupOptionType = "radio",
  runtimeImagesById: Record<string, string | null> = {},
): KioskOption[] {
  const options: KioskOption[] = [];
  for (const item of items) {
    const itemId = item.item ?? item.id ?? item.composite_item_id;
    if (itemId == null) continue;
    const id = String(itemId);
    const runtimeImage = resolveLookupImageUrl(runtimeImagesById[id]);
    const itemLabel = item.item_name || item.name || item.abbreviation || `Item ${id}`;
    const sellingPrice = item.selling_price ?? "";
    const isImageLookup = presentation === "image_radio";

    options.push({
      o_id: `lookup_${groupId}_${id}`,
      composite_item_id: itemId,
      selling_price: sellingPrice,
      id: itemId,
      field_type: presentation,
      value: isImageLookup ? String(itemId) : String(itemId),
      api_name: id,
      label: itemLabel,
      price: sellingPrice,
      subLabel: "Please Select the option",
      image: isImageLookup ? runtimeImage : null,
      placement_mode: isImageLookup ? null : undefined,
      placement: isImageLookup
        ? {
            mode: null,
            coordinates: null,
            target_field: null,
            target_fields: null,
            target_question: null,
          }
        : undefined,
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