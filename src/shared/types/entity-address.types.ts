/** Shared multi-address model for clients, vendors, and purchase orders. */
export type EntityAddressType = "billing" | "shipping" | "other";

export const ENTITY_ADDRESS_TYPES: EntityAddressType[] = ["billing", "shipping", "other"];

export type EntityAddress = {
  id?: number;
  address_type: EntityAddressType;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  is_primary?: boolean;
  /** Optional geo (vendors / maps). */
  latitude?: string | null;
  longitude?: string | null;
};

export type EntityAddressPayload = Omit<EntityAddress, "id">;

export function isEntityAddressType(value: unknown): value is EntityAddressType {
  return value === "billing" || value === "shipping" || value === "other";
}

export function normalizeEntityAddressType(value: unknown): EntityAddressType {
  if (isEntityAddressType(value)) return value;
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "bill" || raw === "bill_to" || raw === "billing") return "billing";
  if (raw === "ship" || raw === "ship_to" || raw === "shipping") return "shipping";
  return "other";
}

export function entityAddressTypeLabelKey(type: EntityAddressType): string {
  if (type === "billing") return "addressType.billing";
  if (type === "shipping") return "addressType.shipping";
  return "addressType.other";
}
