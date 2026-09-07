import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { REJECTION_REASON_PATHS } from "./rejection-reason.paths";
import type {
  RejectionReason,
  RejectionReasonCreatePayload,
  RejectionReasonListResponse,
  RejectionReasonUpdatePayload,
} from "../types/rejection-reason.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

function toWritePayload(body: RejectionReasonCreatePayload | RejectionReasonUpdatePayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.name === "string") out.name = body.name;
  if ("is_active" in body && typeof body.is_active === "boolean") {
    out.is_active = body.is_active;
  }
  return out;
}

export type RejectionReasonListFilters = {
  search?: string;
  is_active?: boolean;
};

export async function fetchRejectionReasonsPage(
  page = 1,
  pageSize = 20,
  filters?: RejectionReasonListFilters,
): Promise<{ items: RejectionReason[]; pagination: RejectionReasonListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);

  const { data } = await api.get<RejectionReasonListResponse>(REJECTION_REASON_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function fetchRejectionReason(id: number): Promise<RejectionReason> {
  const { data } = await api.get<ApiEnvelope<RejectionReason>>(REJECTION_REASON_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createRejectionReason(body: RejectionReasonCreatePayload): Promise<RejectionReason> {
  const { data } = await api.post<ApiEnvelope<RejectionReason>>(
    REJECTION_REASON_PATHS.list,
    toWritePayload(body),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function updateRejectionReason(
  id: number,
  body: RejectionReasonUpdatePayload,
): Promise<RejectionReason> {
  const { data } = await api.patch<ApiEnvelope<RejectionReason>>(
    REJECTION_REASON_PATHS.detail(id),
    toWritePayload(body),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function deleteRejectionReason(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(REJECTION_REASON_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
