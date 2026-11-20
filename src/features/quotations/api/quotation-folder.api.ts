import api from "@/core/api/axios";
import { assertApiSuccess, type ApiEnvelope } from "@/core/types/api.types";
import { QUOTATION_PATHS } from "./quotation.paths";
import type { QuotationFolder } from "../types/quotation-folder.types";

function parseFoldersData(data: unknown): QuotationFolder[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if ("data" in data && Array.isArray((data as { data: unknown }).data)) {
      return (data as { data: QuotationFolder[] }).data;
    }
    if ("results" in data && Array.isArray((data as { results: unknown }).results)) {
      return (data as { results: QuotationFolder[] }).results;
    }
  }
  return [];
}

export async function fetchQuotationFolders(quotationId: number): Promise<QuotationFolder[]> {
  const { data } = await api.get(QUOTATION_PATHS.folders(quotationId));
  return parseFoldersData(data);
}

export async function createQuotationFolder(
  quotationId: number,
  name: string,
): Promise<QuotationFolder> {
  const { data } = await api.post(QUOTATION_PATHS.folders(quotationId), {
    name: name.trim(),
  });
  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<QuotationFolder>);
    return (data as ApiEnvelope<QuotationFolder>).data;
  }
  return data as QuotationFolder;
}

export async function updateQuotationFolder(
  quotationId: number,
  folderId: number,
  name: string,
): Promise<QuotationFolder> {
  const { data } = await api.patch(QUOTATION_PATHS.folderDetail(quotationId, folderId), {
    name: name.trim(),
  });
  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<QuotationFolder>);
    return (data as ApiEnvelope<QuotationFolder>).data;
  }
  return data as QuotationFolder;
}

export async function deleteQuotationFolder(
  quotationId: number,
  folderId: number,
): Promise<void> {
  await api.delete(QUOTATION_PATHS.folderDetail(quotationId, folderId));
}
