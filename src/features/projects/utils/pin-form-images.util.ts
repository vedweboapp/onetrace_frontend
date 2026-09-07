import type { NormalizedFormSection } from "@/features/job-forms/types/job-form-submission.types";

export type FormImagePreview = {
  url: string;
  label: string;
};

function isDisplayableImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/")
  );
}

function collectUrlsFromValue(value: unknown, into: string[]): void {
  if (value == null || value === "") return;
  if (typeof value === "string") {
    if (isDisplayableImageUrl(value)) into.push(value.trim());
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrlsFromValue(item, into);
    return;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidate = obj.file_url ?? obj.url ?? obj.file ?? obj.image;
    if (typeof candidate === "string" && isDisplayableImageUrl(candidate)) {
      into.push(candidate.trim());
    }
  }
}

/** Collect image_upload field URLs from form defaults for pin detail sidebar. */
export function collectFormImagePreviews(
  sections: NormalizedFormSection[],
  values: Record<string, unknown>,
): FormImagePreview[] {
  const out: FormImagePreview[] = [];
  const seen = new Set<string>();

  for (const section of sections) {
    for (const field of section.fields ?? []) {
      const type = String(field.field_type ?? "").toLowerCase();
      if (type !== "image_upload" || !field.api_name) continue;
      const urls: string[] = [];
      collectUrlsFromValue(values[field.api_name], urls);
      const label = field.field_label?.trim() || field.api_name;
      for (const url of urls) {
        if (seen.has(url)) continue;
        seen.add(url);
        out.push({ url, label });
      }
    }
  }

  return out;
}
