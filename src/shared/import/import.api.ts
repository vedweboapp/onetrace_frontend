import api from "@/core/api/axios";
import type { ImportColumnMapping, ModuleImportResult } from "./types";

/** POST `{segment}/import/` with multipart file + JSON mapping string. */
export async function postModuleImport(
  apiSegment: string,
  file: File,
  mapping: ImportColumnMapping[],
): Promise<ModuleImportResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("mapping", JSON.stringify(mapping));

  const segment = apiSegment.replace(/^\/+|\/+$/g, "");
  const { data } = await api.post<ModuleImportResult | { data: ModuleImportResult }>(
    `${segment}/import/`,
    form,
  );

  if (data && typeof data === "object" && "data" in data && data.data) {
    return data.data as ModuleImportResult;
  }
  return (data ?? {}) as ModuleImportResult;
}
