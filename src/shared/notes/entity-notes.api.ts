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
  author?: string | null;
};

export function entityNotesPath(detailPath: string): string {
  return `${detailPath.replace(/\/+$/, "")}/notes/`;
}

export function entityNotePath(detailPath: string, noteId: number): string {
  return `${entityNotesPath(detailPath)}${noteId}/`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return undefined;
}

function readAuthor(rec: Record<string, unknown>): string | null {
  if (typeof rec.created_by_name === "string" && rec.created_by_name.trim()) return rec.created_by_name.trim();
  const createdBy = rec.created_by ?? rec.author ?? rec.user;
  if (typeof createdBy === "string" && createdBy.trim()) return createdBy.trim();
  const row = asRecord(createdBy);
  if (!row) return null;
  const name =
    (typeof row.name === "string" && row.name) ||
    (typeof row.full_name === "string" && row.full_name) ||
    (typeof row.username === "string" && row.username) ||
    "";
  return name.trim() || null;
}

function asNote(value: unknown): EntityNote | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const title = typeof rec.title === "string" ? rec.title : null;
  const content = typeof rec.content === "string" ? rec.content : rec.body;
  const hasBody = Boolean(title?.trim()) || (typeof content === "string" && content.trim());
  const attachments = Array.isArray(rec.attachments) ? (rec.attachments as EntityAttachment[]) : null;
  const id = readId(rec.id);
  if (!hasBody && !attachments?.length && id == null) return null;
  const modified =
    (typeof rec.modified_at === "string" && rec.modified_at) ||
    (typeof rec.updated_at === "string" && rec.updated_at) ||
    null;
  return {
    id,
    title,
    content: typeof content === "string" ? content : null,
    attachments,
    created_at: typeof rec.created_at === "string" ? rec.created_at : null,
    modified_at: modified,
    author: readAuthor(rec),
  };
}

function notesFrom(value: unknown): EntityNote[] | null {
  if (Array.isArray(value)) return value.map(asNote).filter((row): row is EntityNote => row != null);
  const rec = asRecord(value);
  if (!rec) return null;
  for (const key of ["results", "notes", "items"] as const) {
    if (Array.isArray(rec[key])) {
      return (rec[key] as unknown[]).map(asNote).filter((row): row is EntityNote => row != null);
    }
  }
  return null;
}

function unwrapNotes(raw: unknown): EntityNote[] {
  const direct = notesFrom(raw);
  if (direct) return direct;
  const rec = asRecord(raw);
  if (!rec) return [];
  if (rec.success === false) return [];
  const data = "data" in rec ? rec.data : rec;
  const nested = notesFrom(data);
  if (nested) return nested;
  const one = asNote(data);
  return one ? [one] : [];
}

function appendNoteForm(
  input: { title: string; content: string; files: File[]; deletedAttachmentIds?: number[] },
): FormData {
  const fd = new FormData();
  fd.append("title", input.title);
  fd.append("content", input.content);
  for (const file of input.files) {
    fd.append("attachments", file, file.name);
  }
  for (const id of input.deletedAttachmentIds ?? []) {
    fd.append("deleted_attachment_ids", String(id));
  }
  return fd;
}

function readSavedNote(data: unknown): EntityNote | null {
  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<unknown>);
    return asNote((data as ApiEnvelope<unknown>).data);
  }
  return asNote(data);
}

export async function fetchEntityNotes(detailPath: string): Promise<EntityNote[]> {
  const { data } = await api.get<unknown>(entityNotesPath(detailPath), { skipErrorToast: true });
  return unwrapNotes(data);
}

export async function createEntityNote(
  detailPath: string,
  input: { title: string; content: string; files: File[] },
): Promise<EntityNote | null> {
  const { data } = await api.post<ApiEnvelope<unknown> | unknown>(
    entityNotesPath(detailPath),
    appendNoteForm(input),
  );
  return readSavedNote(data);
}

export async function updateEntityNote(
  detailPath: string,
  noteId: number,
  input: { title: string; content: string; files: File[]; deletedAttachmentIds?: number[] },
): Promise<EntityNote | null> {
  const { data } = await api.patch<ApiEnvelope<unknown> | unknown>(
    entityNotePath(detailPath, noteId),
    appendNoteForm(input),
  );
  return readSavedNote(data);
}

export async function deleteEntityNote(detailPath: string, noteId: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown> | "">(entityNotePath(detailPath, noteId));
  if (data && typeof data === "object" && "success" in data) {
    assertApiSuccess(data as ApiEnvelope<unknown>);
  }
}
