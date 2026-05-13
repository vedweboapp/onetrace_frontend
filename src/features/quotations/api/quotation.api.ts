import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { QUOTATION_PATHS } from "./quotation.paths";
import type {
  ProjectLevelForQuotation,
  QuotationCreatePayload,
  QuotationDetail,
  QuotationListItem,
  QuotationListResponse,
  QuotationLevelRef,
  WorkspaceUserRow,
} from "../types/quotation.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type QuotationListFilters = {
  search?: string;
  is_active?: boolean;
  customer?: number;
  site?: number;
  project?: number;
  status?: string;
};

export async function fetchQuotationsPage(
  page = 1,
  pageSize = 20,
  filters?: QuotationListFilters,
): Promise<{ items: QuotationListItem[]; pagination: QuotationListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = {
    page,
    page_size: pageSize,
  };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = filters.is_active;
  if (typeof filters?.customer === "number" && filters.customer > 0) params.customer = filters.customer;
  if (typeof filters?.site === "number" && filters.site > 0) params.site = filters.site;
  if (typeof filters?.project === "number" && filters.project > 0) params.project = filters.project;
  if (filters?.status?.trim()) params.status = filters.status.trim();

  const { data } = await api.get<QuotationListResponse>(QUOTATION_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchQuotation(id: number): Promise<QuotationDetail> {
  const { data } = await api.get<ApiEnvelope<QuotationDetail>>(QUOTATION_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createQuotation(body: QuotationCreatePayload): Promise<QuotationDetail> {
  const { data } = await api.post<ApiEnvelope<QuotationDetail>>(QUOTATION_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

/** Backend creates a draft quotation from the project (all levels / sections). */
export async function createQuotationFromProject(projectId: number): Promise<QuotationDetail> {
  const { data } = await api.post<ApiEnvelope<QuotationDetail>>(QUOTATION_PATHS.list, {
    project: projectId,
    select_all_levels: true,
  });
  assertApiSuccess(data);
  return data.data;
}

export async function updateQuotation(id: number, body: QuotationCreatePayload): Promise<QuotationDetail> {
  const { data } = await api.patch<ApiEnvelope<QuotationDetail>>(QUOTATION_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

/** Loads selectable levels for a project when composing a quotation. */
export async function fetchProjectLevelsForQuotation(projectId: number): Promise<QuotationLevelRef[]> {
  try {
    const { data } = await api.get<ApiEnvelope<ProjectLevelForQuotation[]>>(QUOTATION_PATHS.projectLevels(projectId), {
      skipErrorToast: true,
      params: { page_size: 100 },
    });
    assertApiSuccess(data);
    const rows = Array.isArray(data.data) ? data.data : [];
    return rows
      .map((r) => ({ id: r.id, name: r.name }))
      .filter((r) => Number.isFinite(r.id) && r.id > 0 && typeof r.name === "string");
  } catch {
    return [];
  }
}

export async function fetchProjectLevelRowsForQuotation(projectId: number): Promise<ProjectLevelForQuotation[]> {
  try {
    const { data } = await api.get<ApiEnvelope<ProjectLevelForQuotation[]>>(QUOTATION_PATHS.projectLevels(projectId), {
      skipErrorToast: true,
      params: { page_size: 100 },
    });
    assertApiSuccess(data);
    return Array.isArray(data.data) ? data.data : [];
  } catch {
    return [];
  }
}

/** Attempts to create a new level (drawing) with only a name. */
export async function createProjectLevelForQuotation(
  projectId: number,
  body: { name: string; order?: number },
): Promise<ProjectLevelForQuotation | null> {
  const name = body.name.trim();
  if (!name) return null;
  try {
    const { data } = await api.post<ApiEnvelope<ProjectLevelForQuotation>>(QUOTATION_PATHS.projectLevels(projectId), {
      name,
      ...(typeof body.order === "number" ? { order: body.order } : {}),
    });
    assertApiSuccess(data);
    return data.data ?? null;
  } catch {
    return null;
  }
}

/** Optional; used to populate user role dropdowns when the route exists. */
export async function fetchWorkspaceUsers(): Promise<WorkspaceUserRow[]> {
  try {
    const { data } = await api.get<{ success: boolean; data: WorkspaceUserRow[] }>("users/", {
      params: { page_size: 500 },
      skipErrorToast: true,
    });
    if (data?.success && Array.isArray(data.data)) return data.data;
  } catch {
    /* route may be absent or named differently on the API */
  }
  return [];
}

export type QuotationExportType = "pdf" | "excel" | "csv" | "all";

const EXPORT_EXT: Record<QuotationExportType, string> = {
  pdf: "pdf",
  excel: "xlsx",
  csv: "csv",
  all: "zip",
};

function parseFilenameFromContentDisposition(header: string | undefined): string | null {
  if (!header || typeof header !== "string") return null;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      return encoded[1].trim();
    }
  }
  const basic = /filename="([^"]+)"/i.exec(header);
  if (basic?.[1]) return basic[1].trim();
  const loose = /filename=([^;\s]+)/i.exec(header);
  if (loose?.[1]) return loose[1].replace(/^["']|["']$/g, "").trim();
  return null;
}

function defaultExportFilename(id: number, quoteName: string | undefined, type: QuotationExportType): string {
  const ext = EXPORT_EXT[type];
  const raw = quoteName?.trim() ?? "";
  const safe =
    raw.length > 0
      ? raw
          .replace(/[/\\?%*:|"<>]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 80) || `quotation-${id}`
      : `quotation-${id}`;
  return `${safe}.${ext}`;
}

/**
 * GET `quotations/:id/?type=pdf|excel|csv|all` — downloads the file (blob), not the usual JSON envelope.
 */
export async function exportQuotation(
  id: number,
  type: QuotationExportType,
  quoteName?: string,
): Promise<void> {
  const res = await api.get<Blob>(QUOTATION_PATHS.detail(id), {
    params: { type },
    responseType: "blob",
    skipErrorToast: true,
    headers: {
      Accept: "*/*",
    },
  });
  const blob = res.data;
  const rawContentType = res.headers["content-type"];
  const contentType = (typeof rawContentType === "string" ? rawContentType : "").toLowerCase();
  if (contentType.includes("application/json")) {
    const text = await blob.text();
    try {
      const parsed = JSON.parse(text) as { success?: boolean; message?: string };
      if (parsed && typeof parsed === "object") {
        const msg = typeof parsed.message === "string" ? parsed.message : "Export failed";
        throw new ApiBusinessError(msg);
      }
    } catch (e) {
      if (e instanceof ApiBusinessError) throw e;
    }
    throw new ApiBusinessError("Export failed");
  }

  const rawDisposition = res.headers["content-disposition"];
  const fromHeader = parseFilenameFromContentDisposition(
    typeof rawDisposition === "string" ? rawDisposition : undefined,
  );
  const filename = fromHeader ?? defaultExportFilename(id, quoteName, type);

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
