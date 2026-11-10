import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import {
  applyDropdownListParam,
  resolveDropdownListPages,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";
import { TAX_PATHS } from "./tax.paths";
import type {
  Tax,
  TaxCreatePayload,
  TaxListResponse,
  TaxUpdatePayload,
} from "../types/tax.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

function toTaxWritePayload(body: TaxCreatePayload | TaxUpdatePayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.tax_name === "string") out.tax_name = body.tax_name.trim();
  if (body.tax_percentage !== undefined && body.tax_percentage !== null) {
    out.tax_percentage = String(body.tax_percentage).trim();
  }
  if (typeof body.is_active === "boolean") {
    out.is_active = body.is_active;
  }
  return out;
}

export type TaxListFilters = {
  search?: string;
  is_active?: boolean;
  dropdown?: boolean;
};

export async function fetchTaxesPage(
  page = 1,
  pageSize = 20,
  filters?: TaxListFilters,
): Promise<{ items: Tax[]; pagination: TaxListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);
  applyDropdownListParam(params, filters?.dropdown);

  return resolveDropdownListPages({
    dropdown: filters?.dropdown,
    fetchFirst: async () => {
      const { data } = await api.get<TaxListResponse>(TAX_PATHS.list, { params });
      return parseListApiPage(data, pageSize);
    },
  });
}

export async function fetchTax(id: number | string): Promise<Tax> {
  const { data } = await api.get<ApiEnvelope<Tax>>(TAX_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createTax(body: TaxCreatePayload): Promise<Tax> {
  const { data } = await api.post<ApiEnvelope<Tax>>(TAX_PATHS.list, toTaxWritePayload(body));
  assertApiSuccess(data);
  return data.data;
}

export async function updateTax(id: number | string, body: TaxUpdatePayload): Promise<Tax> {
  const { data } = await api.patch<ApiEnvelope<Tax>>(TAX_PATHS.detail(id), toTaxWritePayload(body));
  assertApiSuccess(data);
  return data.data;
}

export async function deleteTax(id: number | string): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(TAX_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
