import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { PIN_STATUS_PATHS } from "./pin-status.paths";
import type {
  PinStatus,
  PinStatusCreatePayload,
  PinStatusListResponse,
  PinStatusUpdatePayload,
} from "../types/pin-status.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type PinStatusListFilters = {
  search?: string;
};

export async function fetchPinStatusesPage(
  page = 1,
  pageSize = 20,
  filters?: PinStatusListFilters,
): Promise<{ items: PinStatus[]; pagination: PinStatusListResponse["pagination"] }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;

  const { data } = await api.get<PinStatusListResponse>(PIN_STATUS_PATHS.list, { params });
  assertEnvelopeSuccess(data);
  return { items: data.data, pagination: data.pagination };
}

export async function createPinStatus(body: PinStatusCreatePayload): Promise<PinStatus> {
  const { data } = await api.post<ApiEnvelope<PinStatus>>(PIN_STATUS_PATHS.list, body);
  assertApiSuccess(data);
  return data.data;
}

export async function updatePinStatus(
  id: number,
  body: PinStatusUpdatePayload,
): Promise<PinStatus> {
  const { data } = await api.patch<ApiEnvelope<PinStatus>>(PIN_STATUS_PATHS.detail(id), body);
  assertApiSuccess(data);
  return data.data;
}

export async function deletePinStatus(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(PIN_STATUS_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
