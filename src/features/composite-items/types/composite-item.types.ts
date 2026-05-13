import type {
  Item,
  ItemComponentRef,
  ItemCreatePayload,
  ItemListResponse,
  ItemUpdatePayload,
} from "@/features/items/types/item.types";

export type CompositeItem = Item;
export type CompositeItemComponentRef = ItemComponentRef;

/** Composite items are `Item` records with `is_composite: true`. */
export type CompositeItemCreatePayload = Omit<ItemCreatePayload, "is_composite"> & { is_composite?: true };
export type CompositeItemUpdatePayload = ItemUpdatePayload;

export type CompositeItemListResponse = ItemListResponse;
