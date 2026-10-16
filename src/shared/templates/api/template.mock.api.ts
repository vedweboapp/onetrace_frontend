import type { Template, TemplateCategory } from "../types/template.types";
import { emitMockApiNetworkRequest } from "@/shared/config/mock-api-network.util";

const STORAGE_KEY = "onetrace_mock_templates_v1";

const SEED_TEMPLATES: Template[] = [
  {
    id: "1",
    name: "Project Report",
    description: "A professional project status report with sections for summary, progress, and next steps.",
    content: "<h1>Project Report</h1><p>Summary goes here...</p>",
    category: "report",
    module: "quotations",
    created_at: "2026-09-15T10:00:00Z",
    updated_at: "2026-09-20T12:30:00Z",
    is_default: true,
  },
  {
    id: "2",
    name: "Service Invoice",
    description: "Clean invoice template with itemised billing, tax, and payment terms.",
    content: "<h1>Invoice</h1><p>Bill to:</p>",
    category: "invoice",
    module: "quotations",
    created_at: "2026-09-10T09:00:00Z",
    updated_at: "2026-09-10T09:00:00Z",
  },
  {
    id: "3",
    name: "Job Completion Letter",
    description: "Formal letter confirming job completion, sent to clients.",
    content: "<h1>Job Completion</h1><p>Dear Client,</p>",
    category: "letter",
    module: "quotations",
    created_at: "2026-08-28T14:00:00Z",
    updated_at: "2026-08-28T14:00:00Z",
  },
  {
    id: "4",
    name: "Service Contract",
    description: "Standard service agreement with terms, scope, and signature fields.",
    content: "<h1>Service Contract</h1>",
    category: "contract",
    module: "quotations",
    created_at: "2026-08-01T11:00:00Z",
    updated_at: "2026-09-01T11:00:00Z",
  },
];

function delay(ms = 150): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readAll(): Template[] {
  if (typeof window === "undefined") return SEED_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TEMPLATES));
      return SEED_TEMPLATES;
    }
    const parsed = JSON.parse(raw) as Template[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_TEMPLATES;
  } catch {
    return SEED_TEMPLATES;
  }
}

function writeAll(rows: Template[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    console.warn("[Mock Template API] Failed to write to localStorage:", err);
  }
}

function parseTemplateFormData(formData: FormData): {
  id?: string;
  name: string;
  content: string;
  module: string;
  category?: string;
  description?: string;
  Keys?: { Key: string; Type: string; Module: string }[];
  files: File[];
} {
  // Support both old keys (name/module/Keys) and new keys (template_name/module_name/keys)
  const name =
    (formData.get("template_name") as string) ||
    (formData.get("name") as string) ||
    "Untitled Template";
  const content =
    (formData.get("content") as string) ||
    (formData.get("raw_content") as string) ||
    "";
  const moduleName =
    (formData.get("module_name") as string) ||
    (formData.get("module") as string) ||
    "quotations";
  const category = (formData.get("category") as string) || undefined;
  const description = (formData.get("description") as string) || undefined;
  const id = (formData.get("id") as string) || undefined;

  const files: File[] = [];
  for (const [key, value] of formData.entries()) {
    if (
      (
        key === "attachments" ||
        key.startsWith("files[") ||
        key.startsWith("files_") ||
        key === "files" ||
        key === "file"
      ) &&
      typeof value !== "string"
    ) {
      files.push(value);
    }
  }

  let keys: { Key: string; Type: string; Module: string }[] = [];
  // Support both "keys" (new) and "Keys" (old)
  const rawKeys = (formData.get("keys") as string) || (formData.get("Keys") as string);
  if (typeof rawKeys === "string") {
    try {
      const parsed = JSON.parse(rawKeys);
      if (Array.isArray(parsed)) {
        keys = parsed;
      }
    } catch {
      keys = [];
    }
  }

  return {
    ...(id ? { id } : {}),
    name,
    content,
    module: moduleName,
    ...(category ? { category } : {}),
    ...(description ? { description } : {}),
    Keys: keys,
    files,
  };
}

/**
 * Fetch all templates with optional filtering.
 */
export async function getTemplatesMockApi(filters?: {
  search?: string;
  category?: TemplateCategory | string;
}): Promise<Template[]> {
  await delay();
  let rows = readAll();

  if (filters?.category && filters.category !== "all") {
    rows = rows.filter((r) => r.category === filters.category);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q)
    );
  }

  return rows;
}

/**
 * Fetch a single template by ID.
 */
export async function getTemplateByIdMockApi(id: string): Promise<Template | null> {
  await delay();
  const rows = readAll();
  return rows.find((r) => String(r.id) === String(id)) ?? null;
}

/**
 * Create a new template using FormData payload.
 */
export async function createTemplateMockApi(formData: FormData): Promise<Template> {
  await delay(200);

  const parsed = parseTemplateFormData(formData);
  const rows = readAll();

  const newId = String(Date.now());
  const now = new Date().toISOString();

  const newTemplate: Template = {
    id: newId,
    name: parsed.name,
    content: parsed.content,
    module: parsed.module,
    category: parsed.category ?? "custom",
    description: parsed.description,
    Keys: parsed.Keys,
    created_at: now,
    updated_at: now,
    is_default: false,
  };

  const updated = [newTemplate, ...rows];
  writeAll(updated);

  console.log("[Mock API: createTemplate] Saved with FormData:", {
    id: newTemplate.id,
    name: newTemplate.name,
    module: newTemplate.module,
    Keys: newTemplate.Keys,
    binaryFiles: parsed.files.map((f) => ({
      name: f.name,
      size: `${f.size} bytes`,
      type: f.type,
    })),
  });

  // Emits visible request in browser network tab
  void emitMockApiNetworkRequest({
    method: "post",
    path: "/templates",
    data: formData,
  });

  return newTemplate;
}

/**
 * Update an existing template using FormData payload.
 */
export async function updateTemplateMockApi(
  id: string,
  formData: FormData
): Promise<Template> {
  await delay(200);

  const parsed = parseTemplateFormData(formData);
  const rows = readAll();
  const now = new Date().toISOString();

  const existingIdx = rows.findIndex((r) => String(r.id) === String(id));
  let updatedTemplate: Template;

  if (existingIdx >= 0) {
    updatedTemplate = {
      ...rows[existingIdx],
      name: parsed.name,
      content: parsed.content,
      module: parsed.module,
      category: parsed.category ?? rows[existingIdx].category,
      description: parsed.description ?? rows[existingIdx].description,
      Keys: parsed.Keys,
      updated_at: now,
    };
    rows[existingIdx] = updatedTemplate;
  } else {
    updatedTemplate = {
      id: String(id),
      name: parsed.name,
      content: parsed.content,
      module: parsed.module,
      category: parsed.category ?? "custom",
      description: parsed.description,
      Keys: parsed.Keys,
      created_at: now,
      updated_at: now,
      is_default: false,
    };
    rows.unshift(updatedTemplate);
  }

  writeAll(rows);

  console.log("[Mock API: updateTemplate] Updated with FormData:", {
    id: updatedTemplate.id,
    name: updatedTemplate.name,
    module: updatedTemplate.module,
    binaryFiles: parsed.files.map((f) => ({
      name: f.name,
      size: `${f.size} bytes`,
      type: f.type,
    })),
  });

  // Emits visible request in browser network tab
  void emitMockApiNetworkRequest({
    method: "put",
    path: `/templates/${id}`,
    data: formData,
  });

  return updatedTemplate;
}

/**
 * Unified save function: creates if no ID, otherwise updates.
 */
export async function saveTemplateMockApi(
  formData: FormData,
  templateId?: string
): Promise<Template> {
  const id = templateId || (formData.get("id") as string | null);
  if (id) {
    return updateTemplateMockApi(id, formData);
  }
  return createTemplateMockApi(formData);
}

/**
 * Delete a template by ID.
 */
export async function deleteTemplateMockApi(id: string): Promise<void> {
  await delay(150);
  const rows = readAll();
  const updated = rows.filter((r) => String(r.id) !== String(id));
  writeAll(updated);

  void emitMockApiNetworkRequest({
    method: "delete",
    path: `/templates/${id}`,
  });
}
