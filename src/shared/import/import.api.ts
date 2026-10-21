import api from "@/core/api/axios";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import type {
  ImportColumnMapping,
  ModuleImportQueueResult,
  ModuleImportResult,
  ModuleImportStatusResult,
} from "./types";

function normalizeSegment(apiSegment: string): string {
  return apiSegment.replace(/^\/+|\/+$/g, "");
}

function unwrapData<T extends object>(payload: T | ApiEnvelope<T> | { data: T }): T {
  if (payload && typeof payload === "object" && "data" in payload && payload.data) {
    return payload.data as T;
  }
  return payload as T;
}

/** POST `{segment}/import/` with multipart file + JSON mapping string. */
export async function postModuleImport(
  apiSegment: string,
  file: File,
  mapping: ImportColumnMapping[],
): Promise<ModuleImportQueueResult | ModuleImportResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("mapping", JSON.stringify(mapping));

  const segment = normalizeSegment(apiSegment);
  const { data } = await api.post<
    ApiEnvelope<ModuleImportQueueResult | ModuleImportResult> | ModuleImportQueueResult | ModuleImportResult
  >(`${segment}/import/`, form);

  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<ModuleImportQueueResult | ModuleImportResult>);
  }

  const body = unwrapData(data as ModuleImportQueueResult | ModuleImportResult | { data: ModuleImportQueueResult });
  if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
    return { ...body, message: body.message ?? data.message };
  }
  return body ?? ({} as ModuleImportQueueResult);
}

/** GET `{segment}/import-status/{taskId}/` for background import progress. */
export async function fetchModuleImportStatus(
  apiSegment: string,
  taskId: string,
): Promise<ModuleImportStatusResult> {
  const segment = normalizeSegment(apiSegment);
  const id = encodeURIComponent(taskId.trim());
  const { data } = await api.get<
    ApiEnvelope<ModuleImportStatusResult> | ModuleImportStatusResult
  >(`${segment}/import-status/${id}/`);

  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<ModuleImportStatusResult>);
  }

  const body = unwrapData(data as ModuleImportStatusResult | { data: ModuleImportStatusResult });
  if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
    return { ...body, message: body.message ?? data.message };
  }
  return body ?? {};
}

export function isModuleImportQueued(
  result: ModuleImportQueueResult | ModuleImportResult,
): result is ModuleImportQueueResult {
  return typeof (result as ModuleImportQueueResult).task_id === "string"
    && Boolean((result as ModuleImportQueueResult).task_id.trim());
}

export function isImportStatusTerminal(state: string | undefined | null): boolean {
  const normalized = (state ?? "").trim().toUpperCase();
  return (
    normalized === "SUCCESS"
    || normalized === "FAILURE"
    || normalized === "FAILED"
    || normalized === "ERROR"
    || normalized === "REVOKED"
  );
}

export function isImportStatusSuccess(state: string | undefined | null): boolean {
  return (state ?? "").trim().toUpperCase() === "SUCCESS";
}
