export type QuickCreateResult = {
  id: number;
  label: string;
};

export type QuickCreateKind =
  | "client"
  | "contact"
  | "site"
  | "project"
  | "group"
  | "composite-item"
  | "item";

export type QuickCreateClientOption = { value: string; label: string };
