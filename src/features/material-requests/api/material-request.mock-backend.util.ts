import { resolveBackendOrigin } from "@/core/config/api-url.util";

export type MockMaterialRequestListFilters = {
  search?: string;
  status?: string;
  requested_date?: string;
  worker_name?: string | number;
  page: number;
  pageSize: number;
};

function backendHeaders(authHeader?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (authHeader?.trim()) headers.Authorization = authHeader.trim();
  return headers;
}

async function readJson<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type ApiListEnvelope<T> = {
  success?: boolean;
  data?: T[];
};

type ApiDetailEnvelope<T> = {
  success?: boolean;
  data?: T;
};

export async function mockBackendFetchJob(
  id: number,
  authHeader?: string | null,
): Promise<{
  id: number;
  title?: string | null;
  project?: { id: number; name?: string | null } | null;
  job_meta?: unknown;
} | null> {
  const res = await fetch(`${resolveBackendOrigin()}/api/v1/jobs/${id}/`, {
    headers: backendHeaders(authHeader),
    cache: "no-store",
  });
  const body = await readJson<ApiDetailEnvelope<{
    id: number;
    title?: string | null;
    project?: { id: number; name?: string | null } | null;
    job_meta?: unknown;
  }>>(res);
  return body?.data ?? null;
}

export async function mockBackendFetchItemLabels(
  authHeader?: string | null,
): Promise<Record<number, string>> {
  const res = await fetch(`${resolveBackendOrigin()}/api/v1/items/?page=1&page_size=500&is_active=true`, {
    headers: backendHeaders(authHeader),
    cache: "no-store",
  });
  const body = await readJson<ApiListEnvelope<{ id: number; name?: string | null; sku?: string | null }>>(res);
  const labels: Record<number, string> = {};
  for (const item of body?.data ?? []) {
    labels[item.id] = item.name?.trim() || item.sku?.trim() || `#${item.id}`;
  }
  return labels;
}

export function parseMaterialRequestListFilters(
  searchParams: URLSearchParams,
): MockMaterialRequestListFilters {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(searchParams.get("page_size") ?? "20", 10) || 20);
  return {
    page,
    pageSize,
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    requested_date: searchParams.get("requested_date") ?? undefined,
    worker_name: searchParams.get("worker_name") ?? undefined,
  };
}
