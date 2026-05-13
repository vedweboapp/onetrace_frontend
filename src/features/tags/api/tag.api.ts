import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { TAG_PATHS } from "./tag.paths";
import type { Tag, TagCreatePayload, TagListResponse, TagUpdatePayload } from "../types/tag.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type TagListFilters = {
  search?: string;
  is_active?: boolean;
};

function toTagWritePayload(body: TagCreatePayload | TagUpdatePayload): Record<string, unknown> {
  const src = body as {
    name?: string;
    bg_colour?: string;
    text_colour?: string;
    bg_color?: string;
    text_color?: string;
  };
  const out: Record<string, unknown> = {};
  if (typeof src.name === "string") out.name = src.name;
  const bg = src.bg_color ?? src.bg_colour;
  const text = src.text_color ?? src.text_colour;
  if (typeof bg === "string") out.bg_color = bg;
  if (typeof text === "string") out.text_color = text;
  return out;
}

export async function fetchTagsPage(
  page = 1,
  pageSize = 20,
  filters?: TagListFilters,
): Promise<{ items: Tag[]; pagination: TagListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);

  const { data } = await api.get<TagListResponse>(TAG_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function createTag(body: TagCreatePayload): Promise<Tag> {
  const { data } = await api.post<ApiEnvelope<Tag>>(TAG_PATHS.list, toTagWritePayload(body));
  assertApiSuccess(data);
  return data.data;
}

export async function updateTag(id: number, body: TagUpdatePayload): Promise<Tag> {
  const { data } = await api.patch<ApiEnvelope<Tag>>(TAG_PATHS.detail(id), toTagWritePayload(body));
  assertApiSuccess(data);
  return data.data;
}

export async function deleteTag(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(TAG_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
