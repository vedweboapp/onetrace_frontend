import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import {
  applyDropdownListParam,
  resolveDropdownListPages,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";
import { UNIT_TYPE_PATHS } from "./unit-type.paths";
import type {
  UnitType,
  UnitTypeCreatePayload,
  UnitTypeListResponse,
  UnitTypeUpdatePayload,
} from "../types/unit-type.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

function toUnitTypeWritePayload(body: UnitTypeCreatePayload | UnitTypeUpdatePayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.name === "string") out.name = body.name;
  if ("is_active" in body && typeof (body as { is_active?: unknown }).is_active === "boolean") {
    out.is_active = (body as { is_active: boolean }).is_active;
  }
  if (typeof (body as { short_form?: unknown }).short_form === "string") {
    out.short_form = (body as { short_form: string }).short_form;
  }
  if ((body as { short_form?: unknown }).short_form === null) {
    out.short_form = null;
  }
  return out;
}

export type UnitTypeListFilters = {
  search?: string;
  is_active?: boolean;
  dropdown?: boolean;
};

export async function fetchUnitTypesPage(
  page = 1,
  pageSize = 20,
  filters?: UnitTypeListFilters,
): Promise<{ items: UnitType[]; pagination: UnitTypeListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  if (typeof filters?.is_active === "boolean") params.is_active = String(filters.is_active);
  applyDropdownListParam(params, filters?.dropdown);

  return resolveDropdownListPages({
    dropdown: filters?.dropdown,
    fetchFirst: async () => {
      const { data } = await api.get<UnitTypeListResponse>(UNIT_TYPE_PATHS.list, { params });
      return parseListApiPage(data, pageSize);
    },
  });
}

export async function fetchUnitType(id: number): Promise<UnitType> {
  const { data } = await api.get<ApiEnvelope<UnitType>>(UNIT_TYPE_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createUnitType(body: UnitTypeCreatePayload): Promise<UnitType> {
  const { data } = await api.post<ApiEnvelope<UnitType>>(UNIT_TYPE_PATHS.list, toUnitTypeWritePayload(body));
  assertApiSuccess(data);
  return data.data;
}

export async function updateUnitType(id: number, body: UnitTypeUpdatePayload): Promise<UnitType> {
  const { data } = await api.patch<ApiEnvelope<UnitType>>(UNIT_TYPE_PATHS.detail(id), toUnitTypeWritePayload(body));
  assertApiSuccess(data);
  return data.data;
}

export async function deleteUnitType(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(UNIT_TYPE_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
