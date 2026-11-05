import api from "@/core/api/axios";
import { assertApiSuccess, type ApiEnvelope } from "@/core/types/api.types";
import type { EntityAttachment } from "@/shared/attachments/entity-attachment.types";

export const NOTE_MAX_FILES = 5;
export const NOTE_MAX_BYTES = 20 * 1024 * 1024;

export type EntityNote = {
  id?: number;
  title?: string | null;
  content?: string | null;
  attachments?: EntityAttachment[] | null;
  created_at?: string | null;
  modified_at?: string | null;
};

export function entityNotesPath(detailPath: string): string {
  return `${detailPath.replace(/\/+$/, "")}/notes/`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNote(value: unknown): EntityNote | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const title = typeof rec.title === "string" ? rec.title : null;
  const content = typeof rec.content === "string" ? rec.content : rec.body;
  const hasBody = Boolean(title?.trim()) || (typeof content === "string" && content.trim());
  const attachments = Array.isArray(rec.attachments) ? (rec.attachments as EntityAttachment[]) : null;
  if (!hasBody && !attachments?.length && rec.id == null) return null;
  return {
    id: typeof rec.id === "number" ? rec.id : undefined,
    title,
    content: typeof content === "string" ? content : null,
    attachments,
    created_at: typeof rec.created_at === "string" ? rec.created_at : null,
    modified_at: typeof rec.modified_at === "string" ? rec.modified_at : null,
  };
}

function unwrapNotes(raw: unknown): EntityNote[] {
  if (Array.isArray(raw)) return raw.map(asNote).filter((row): row is EntityNote => row != null);
  const rec = asRecord(raw);
  if (!rec) return [];
  if (rec.success === false) return [];
  const data = "data" in rec ? rec.data : rec;
  if (Array.isArray(data)) return data.map(asNote).filter((row): row is EntityNote => row != null);
  const one = asNote(data);
  return one ? [one] : [];
}

export async function fetchEntityNotes(detailPath: string): Promise<EntityNote[]> {
  const { data } = await api.get<unknown>(entityNotesPath(detailPath), { skipErrorToast: true });
  return unwrapNotes(data);
}

export async function createEntityNote(
  detailPath: string,
  input: { title: string; content: string; files: File[] },
): Promise<EntityNote | null> {
  const fd = new FormData();
  fd.append("title", input.title);
  fd.append("content", input.content);
  for (const file of input.files) {
    fd.append("attachments", file, file.name);
  }
  const { data } = await api.patch<ApiEnvelope<unknown> | unknown>(entityNotesPath(detailPath), fd);
  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<unknown>);
    const saved = asNote((data as ApiEnvelope<unknown>).data);
    return saved;
  }
  return asNote(data);
}
