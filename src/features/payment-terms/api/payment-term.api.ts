import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import {
  applyDropdownListParam,
  resolveDropdownListPages,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";
import { PAYMENT_TERM_PATHS } from "./payment-term.paths";
import type {
  PaymentTerm,
  PaymentTermCreatePayload,
  PaymentTermListResponse,
  PaymentTermUpdatePayload,
} from "../types/payment-term.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

function toPaymentTermWritePayload(
  body: PaymentTermCreatePayload | PaymentTermUpdatePayload,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.payment_term_label === "string") out.payment_term_label = body.payment_term_label;
  if (typeof body.payment_term_days === "number") out.payment_term_days = body.payment_term_days;
  if (typeof body.is_default === "boolean") out.is_default = body.is_default;
  if (typeof body.payment_terms_discount_percentage === "number") {
    out.payment_terms_discount_percentage = body.payment_terms_discount_percentage;
  }
  if ("payment_terms_discount_due_days" in body) {
    out.payment_terms_discount_due_days = body.payment_terms_discount_due_days ?? null;
  }
  if (typeof body.type === "string") out.type = body.type;
  if (typeof body.is_system_terms === "boolean") out.is_system_terms = body.is_system_terms;
  if (typeof (body as PaymentTermUpdatePayload).status === "string") {
    out.status = (body as PaymentTermUpdatePayload).status;
  }
  return out;
}

export type PaymentTermListFilters = {
  search?: string;
  dropdown?: boolean;
};

export async function fetchPaymentTermsPage(
  page = 1,
  pageSize = 20,
  filters?: PaymentTermListFilters,
): Promise<{ items: PaymentTerm[]; pagination: PaymentTermListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  applyDropdownListParam(params, filters?.dropdown);

  return resolveDropdownListPages({
    dropdown: filters?.dropdown,
    fetchFirst: async () => {
      const { data } = await api.get<PaymentTermListResponse>(PAYMENT_TERM_PATHS.list, { params });
      return parseListApiPage(data, pageSize);
    },
  });
}

export async function fetchPaymentTerm(id: number): Promise<PaymentTerm> {
  const { data } = await api.get<ApiEnvelope<PaymentTerm>>(PAYMENT_TERM_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createPaymentTerm(body: PaymentTermCreatePayload): Promise<PaymentTerm> {
  const { data } = await api.post<ApiEnvelope<PaymentTerm>>(
    PAYMENT_TERM_PATHS.list,
    toPaymentTermWritePayload(body),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function updatePaymentTerm(
  id: number,
  body: PaymentTermUpdatePayload,
): Promise<PaymentTerm> {
  const { data } = await api.patch<ApiEnvelope<PaymentTerm>>(
    PAYMENT_TERM_PATHS.detail(id),
    toPaymentTermWritePayload(body),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function deletePaymentTerm(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(PAYMENT_TERM_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
