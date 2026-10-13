export interface Template {
  id: string;
  name: string;
  description?: string;
  content: string; // HTML from TipTap
  category?: string;
  module?: string;
  created_at: string;
  updated_at: string;
  is_default?: boolean;
  thumbnail?: string; // preview snippet
  Keys?: { Key: string; Type: string; Module: string }[];
}

export type TemplateCategory = "all" | "report" | "invoice" | "letter" | "contract" | "custom";
