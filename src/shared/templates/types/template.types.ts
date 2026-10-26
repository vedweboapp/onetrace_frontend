export interface TemplateAttachment {
  id: number;
  file: string;       // full URL to the uploaded file
  file_name: string;  // original filename (used to match img src in HTML content)
  file_size?: number;
  content_type_value?: string;
  created_at?: string;
}

export interface Template {
  id: string;
  name: string;
  template_name?: string;
  description?: string;
  content: string; // HTML from TipTap
  category?: string;
  module?: string;
  module_name?: string;
  created_at: string;
  updated_at: string;
  is_default?: boolean;
  is_global_header?: boolean; // true when the template has a global (copy-to-whole) header
  thumbnail?: string; // preview snippet
  Keys?: { Key: string; Type: string; Module: string; Columns?: string[]; columns?: string[] }[];
  keys?: { Key: string; Type: string; Module: string; Columns?: string[]; columns?: string[] }[];
  attachments?: TemplateAttachment[];
}

export type TemplateCategory = "all" | "quotations" | "orders" | "invoice" | "email";
