export type QuickCreateResult = {
  id: number;
  label: string;
};

export type QuickCreateKind =
  | "client"
  | "vendor"
  | "contact"
  | "site"
  | "project"
  | "group"
  | "composite-item"
  | "item";

const QUICK_CREATE_KINDS: readonly QuickCreateKind[] = [
  "client",
  "vendor",
  "contact",
  "site",
  "project",
  "group",
  "composite-item",
  "item",
] as const;

export function isQuickCreateKind(value: string | null | undefined): value is QuickCreateKind {
  return value != null && (QUICK_CREATE_KINDS as readonly string[]).includes(value);
}

export type QuickCreateClientOption = { value: string; label: string };
