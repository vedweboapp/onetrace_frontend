import api from "@/core/api/axios";
import type { Template, TemplateCategory } from "../types/template.types";

// ─── API helpers ──────────────────────────────────────────────────────────────

/**
 * Normalise response envelope – backend may return:
 *   { success: true, data: Template | Template[] }
 *   or the raw object / array directly.
 */
function unwrap<T>(response: unknown): T {
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    if ("data" in r && r.data !== undefined) return r.data as T;
  }
  return response as T;
}

function normalizeTemplate(raw: unknown): Template {
  if (!raw || typeof raw !== "object") return raw as Template;
  const item = raw as Record<string, unknown>;
  const name = (item.name as string) || (item.template_name as string) || "";
  const module = (item.module as string) || (item.module_name as string) || "";
  return {
    ...item,
    name,
    template_name: (item.template_name as string) || name,
    module,
    module_name: (item.module_name as string) || module,
  } as Template;
}

// ─── GET /settings/templates ──────────────────────────────────────────────────
export async function getTemplates(filters?: {
  search?: string;
  category?: TemplateCategory | string;
  module?: string;
}): Promise<Template[]> {
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;
  if (filters?.category && filters.category !== "all") params.category = filters.category;
  if (filters?.module) {
    params.module = filters.module;
    params.module_name = filters.module;
  }

  const { data } = await api.get("settings/templates", { params, skipErrorToast: true });
  const result = unwrap<Template[]>(data);
  return Array.isArray(result) ? result.map(normalizeTemplate) : [];
}

// ─── GET /settings/templates/:id ─────────────────────────────────────────────
export async function getTemplateById(id: string): Promise<Template | null> {
  try {
    const { data } = await api.get(`settings/templates/${id}`, { skipErrorToast: true });
    const result = unwrap<Template>(data);
    return result ? normalizeTemplate(result) : null;
  } catch {
    return null;
  }
}

// ─── POST /settings/templates ─────────────────────────────────────────────────
export async function createTemplate(formData: FormData): Promise<Template> {
  const { data } = await api.post("settings/templates", formData);
  return normalizeTemplate(unwrap<Template>(data));
}

// ─── PUT /settings/templates/:id ─────────────────────────────────────────────
export async function updateTemplate(id: string, formData: FormData): Promise<Template> {
  const { data } = await api.put(`settings/templates/${id}`, formData);
  return normalizeTemplate(unwrap<Template>(data));
}

/**
 * Unified save: creates if no id, otherwise updates.
 */
export async function saveTemplate(
  formData: FormData,
  templateId?: string
): Promise<Template> {
  const id = templateId || (formData.get("id") as string | null);
  if (id) return updateTemplate(id, formData);
  return createTemplate(formData);
}

// ─── DELETE /settings/templates/:id ──────────────────────────────────────────
export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`settings/templates/${id}`);
}
