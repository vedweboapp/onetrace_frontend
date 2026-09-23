import type { KioskOption, KioskQuestion, LookupOptionType } from "../types/kiosk.types";
import { resolveItemAttachmentUrl } from "@/features/items/utils/item-attachment-display.util";

type LookupItem = {
  item?: number | string;
  id?: number | string;
  item_name?: string | null;
  name?: string | null;
  abbreviation?: string | null;
  selling_price?: number | string | null;
  item_selling_price?: number | string | null;
  composite_item_id?: number | string | null;
  image?: string | null;
  image_url?: string | null;
  thumbnail?: string | null;
  item_attachments?: { file?: string | null }[];
  attachments?: unknown[];
  [key: string]: unknown;
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
    const firstGroupAttachment = item.item_attachments?.[0];
    const attachment = firstGroupAttachment?.file
      ? firstGroupAttachment.file
      : Array.isArray(item.attachments)
        ? item.attachments.find((row) => Boolean(resolveItemAttachmentUrl(row as any)))
        : null;
    const groupImage =
      (typeof attachment === "string"
        ? resolveLookupImageUrl(attachment)
        : attachment
          ? resolveItemAttachmentUrl(attachment as any)
          : null) ||
      resolveLookupImageUrl(item.image) ||
      resolveLookupImageUrl(item.image_url) ||
      resolveLookupImageUrl(item.thumbnail);
    const runtimeImage = groupImage || resolveLookupImageUrl(runtimeImagesById[id]);
    const itemLabel = item.item_name || item.name || item.abbreviation || `Item ${id}`;
    const sellingPrice = item.item_selling_price ?? item.selling_price ?? "";
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
      sub_label: "Please Select the option",
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

export function mergeLookupOptions(
  runtimeOptions: KioskOption[],
  savedOptions: KioskOption[] = [],
): KioskOption[] {
  const savedByCompositeId = new Map(
    savedOptions
      .filter((option) => option.composite_item_id != null)
      .map((option) => [String(option.composite_item_id), option]),
  );

  return runtimeOptions.map((runtimeOption) => {
    const savedOption = savedByCompositeId.get(
      String(runtimeOption.composite_item_id),
    );
    if (!savedOption) return runtimeOption;

    return {
      ...runtimeOption,
      ...savedOption,
      o_id: runtimeOption.o_id,
      composite_item_id: runtimeOption.composite_item_id,
      field_type: runtimeOption.field_type,
      value: runtimeOption.value,
      api_name: runtimeOption.api_name,
      label: runtimeOption.label,
      sub_label: runtimeOption.sub_label || runtimeOption.subLabel,
      price: runtimeOption.price,
      selling_price: runtimeOption.selling_price,
      image: runtimeOption.image,
    };
  });
}

export function getQuestionOptions(question: KioskQuestion): KioskOption[] {
  return [
    ...(question.options || []),
    ...(question.groups || []).flatMap((group) => group.options || []),
  ];
}

export function isLookupQuestion(question: KioskQuestion): boolean {
  return Boolean(
    question.is_lookup ||
      question.item_group_id != null ||
      getQuestionOptions(question).some(
        (option) => option.o_id?.startsWith("lookup_") || option.composite_item_id != null,
      ),
  );
}

export function getLookupGroupId(question: KioskQuestion): string | number | null {
  if (question.item_group_id != null) return question.item_group_id;

  const savedOption = getQuestionOptions(question).find(
    (option) => option.o_id?.startsWith("lookup_"),
  );
  const match = savedOption?.o_id?.match(/^lookup_(.+)_([^_]+)$/);
  return match?.[1] || null;
}