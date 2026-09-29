import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import {
  applyDropdownListParam,
  resolveDropdownListPages,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";
import { PAYMENT_MODE_PATHS } from "./payment-mode.paths";
import type {
  PaymentMode,
  PaymentModeCreatePayload,
  PaymentModeListResponse,
  PaymentModeUpdatePayload,
} from "../types/payment-mode.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

function toPaymentModeWritePayload(
  body: PaymentModeCreatePayload | PaymentModeUpdatePayload,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.name === "string") out.name = body.name;
  if (typeof body.system_name === "string") out.system_name = body.system_name;
  if (typeof body.is_default === "boolean") out.is_default = body.is_default;
  if (typeof body.is_mandatory === "boolean") out.is_mandatory = body.is_mandatory;
  return out;
}

export type PaymentModeListFilters = {
  search?: string;
  dropdown?: boolean;
};

export async function fetchPaymentModesPage(
  page = 1,
  pageSize = 20,
  filters?: PaymentModeListFilters,
): Promise<{ items: PaymentMode[]; pagination: PaymentModeListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  applyDropdownListParam(params, filters?.dropdown);

  return resolveDropdownListPages({
    dropdown: filters?.dropdown,
    fetchFirst: async () => {
      const { data } = await api.get<PaymentModeListResponse>(PAYMENT_MODE_PATHS.list, { params });
      return parseListApiPage(data, pageSize);
    },
  });
}

export async function fetchPaymentMode(id: number): Promise<PaymentMode> {
  const { data } = await api.get<ApiEnvelope<PaymentMode>>(PAYMENT_MODE_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createPaymentMode(body: PaymentModeCreatePayload): Promise<PaymentMode> {
  const { data } = await api.post<ApiEnvelope<PaymentMode>>(
    PAYMENT_MODE_PATHS.list,
    toPaymentModeWritePayload(body),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function updatePaymentMode(
  id: number,
  body: PaymentModeUpdatePayload,
): Promise<PaymentMode> {
  const { data } = await api.patch<ApiEnvelope<PaymentMode>>(
    PAYMENT_MODE_PATHS.detail(id),
    toPaymentModeWritePayload(body),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function deletePaymentMode(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(PAYMENT_MODE_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
