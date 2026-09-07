import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { TITLE_PATHS } from "./title.paths";
import type { Title, TitleCreatePayload, TitleListResponse, TitleUpdatePayload } from "../types/title.types";
import { titleNameFromRow } from "../utils/title-display.util";

type TitleApiRow = Title & {
  title?: string | null;
  name?: string | null;
  site_title?: string | null;
  updated_at?: string | null;
};

function normalizeTitle(row: TitleApiRow): Title {
  const modified_at = row.modified_at ?? row.updated_at ?? row.created_at ?? "";
  return {
    ...row,
    title: titleNameFromRow(row),
    modified_at,
  };
}

function toTitleWritePayload(body: TitleCreatePayload | TitleUpdatePayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.title === "string") out.title = body.title;
  return out;
}

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type TitleListFilters = {
  search?: string;
};

export async function fetchTitlesPage(
  page = 1,
  pageSize = 20,
  filters?: TitleListFilters,
): Promise<{ items: Title[]; pagination: TitleListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;

  const { data } = await api.get<TitleListResponse>(TITLE_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data.map((row) => normalizeTitle(row as TitleApiRow)), pagination: data.pagination };
}

export async function fetchTitle(id: number): Promise<Title> {
  const { data } = await api.get<ApiEnvelope<Title>>(TITLE_PATHS.detail(id));
  assertApiSuccess(data);
  return normalizeTitle(data.data as TitleApiRow);
}

export async function createTitle(body: TitleCreatePayload): Promise<Title> {
  const { data } = await api.post<ApiEnvelope<Title>>(TITLE_PATHS.list, toTitleWritePayload(body));
  assertApiSuccess(data);
  return normalizeTitle(data.data as TitleApiRow);
}

export async function updateTitle(id: number, body: TitleUpdatePayload): Promise<Title> {
  const { data } = await api.patch<ApiEnvelope<Title>>(TITLE_PATHS.detail(id), toTitleWritePayload(body));
  assertApiSuccess(data);
  return normalizeTitle(data.data as TitleApiRow);
}

export async function deleteTitle(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(TITLE_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
