import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import {
  filenameFromContentDisposition,
  triggerBlobDownload,
} from "@/shared/mass-actions/mass-action.util";
import { parseListApiPage } from "@/shared/utils/list-dropdown-fetch.util";
import { DATA_ADMINISTRATION_PATHS } from "./data-administration.paths";
import type {
  DataAdministrationListResponse,
  DataAdministrationLog,
} from "../types/data-administration.types";

async function parseBlobError(blob: Blob): Promise<string | null> {
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text) as { message?: string; success?: boolean };
    if (parsed.success === false && typeof parsed.message === "string") return parsed.message;
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    /* not json */
  }
  return null;
}

export async function fetchImportHistoryPage(page = 1, pageSize = 20) {
  const { data } = await api.get<DataAdministrationListResponse>(DATA_ADMINISTRATION_PATHS.importHistory, {
    params: { page, page_size: pageSize },
  });
  return parseListApiPage<DataAdministrationLog>(data, pageSize);
}

export async function fetchExportHistoryPage(page = 1, pageSize = 20) {
  const { data } = await api.get<DataAdministrationListResponse>(DATA_ADMINISTRATION_PATHS.exportHistory, {
    params: { page, page_size: pageSize },
  });
  return parseListApiPage<DataAdministrationLog>(data, pageSize);
}

export async function undoDataAdministrationLog(logId: number): Promise<void> {
  const { data } = await api.post<ApiEnvelope<unknown>>(DATA_ADMINISTRATION_PATHS.undo(logId));
  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<unknown>);
  }
}

export async function redoDataAdministrationLog(logId: number): Promise<void> {
  const { data } = await api.post<ApiEnvelope<unknown>>(DATA_ADMINISTRATION_PATHS.redo(logId));
  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<unknown>);
  }
}

async function downloadDataAdministrationFile(
  path: string,
  fallbackFilename: string,
): Promise<void> {
  const response = await api.get<Blob>(path, {
    responseType: "blob",
    skipErrorToast: true,
  });
  const blob = response.data;
  const contentType = String(response.headers["content-type"] ?? "");
  if (contentType.includes("application/json")) {
    const message = await parseBlobError(blob);
    throw new ApiBusinessError(message ?? "Download failed");
  }
  const disposition = response.headers["content-disposition"] as string | undefined;
  const filename = filenameFromContentDisposition(disposition, fallbackFilename);
  triggerBlobDownload(blob, filename);
}

export async function downloadDataAdministrationOriginal(logId: number): Promise<void> {
  await downloadDataAdministrationFile(
    DATA_ADMINISTRATION_PATHS.downloadOriginal(logId),
    `import-${logId}-original`,
  );
}

export async function downloadDataAdministrationSkipped(logId: number): Promise<void> {
  await downloadDataAdministrationFile(
    DATA_ADMINISTRATION_PATHS.downloadSkipped(logId),
    `import-${logId}-skipped`,
  );
}
