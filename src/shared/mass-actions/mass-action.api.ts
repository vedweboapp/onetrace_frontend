import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import {
  filenameFromContentDisposition,
  massExportFallbackFilename,
  triggerBlobDownload,
} from "./mass-action.util";
import type { MassActionConfig, MassExportFormat } from "./types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

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

export async function postMassUpdate(path: string, body: Record<string, unknown>): Promise<void> {
  const { data } = await api.post<ApiEnvelope<unknown>>(path, body);
  assertApiSuccess(data);
}

export async function postMassDelete(path: string, body: Record<string, unknown>): Promise<void> {
  const { data } = await api.post<ApiEnvelope<unknown>>(path, body);
  assertApiSuccess(data);
}

export async function postMassExport(
  path: string,
  body: Record<string, unknown>,
  fallbackFilename: string,
): Promise<void> {
  const response = await api.post<Blob>(path, body, {
    responseType: "blob",
    skipErrorToast: true,
  });
  const blob = response.data;
  const contentType = String(response.headers["content-type"] ?? "");
  if (contentType.includes("application/json")) {
    const message = await parseBlobError(blob);
    throw new ApiBusinessError(message ?? "Export failed");
  }
  const disposition = response.headers["content-disposition"] as string | undefined;
  const filename = filenameFromContentDisposition(disposition, fallbackFilename);
  triggerBlobDownload(blob, filename);
}

export function createMassActionClient(config: MassActionConfig) {
  return {
    massUpdate: (body: Record<string, unknown>) => postMassUpdate(config.paths.massUpdate, body),
    massDelete: (body: Record<string, unknown>) => postMassDelete(config.paths.massDelete, body),
    massExport: (body: Record<string, unknown>, exportFormat: MassExportFormat = "xlsx") =>
      postMassExport(
        config.paths.massExport,
        body,
        massExportFallbackFilename(config.exportFileName, exportFormat),
      ),
  };
}
