import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import {
  applyDropdownListParam,
  parseListApiPage,
  resolveDropdownListPages,
} from "@/shared/utils/list-dropdown-fetch.util";
import { LABOUR_TYPE_PATHS } from "./labour-type.paths";
import type {
  LabourType,
  LabourTypeCreatePayload,
  LabourTypeListResponse,
  LabourTypeUpdatePayload,
} from "../types/labour-type.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

function toLabourTypeWritePayload(
  body: LabourTypeCreatePayload | LabourTypeUpdatePayload,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.name === "string") out.name = body.name;
  if (typeof body.description === "string") out.description = body.description;
  if (typeof body.default_markup === "number") out.default_markup = body.default_markup;
  if (typeof body.default_cost_rate === "number") out.default_cost_rate = body.default_cost_rate;
  if (typeof body.default_sell_price === "number") out.default_sell_price = body.default_sell_price;
  return out;
}

export type LabourTypeListFilters = {
  search?: string;
  dropdown?: boolean;
};

export async function fetchLabourTypesPage(
  page = 1,
  pageSize = 20,
  filters?: LabourTypeListFilters,
): Promise<{ items: LabourType[]; pagination: LabourTypeListResponse["pagination"] }> {
  const params: Record<string, string | number | boolean> = { page, page_size: pageSize };
  const q = filters?.search?.trim();
  if (q) params.search = q;
  applyDropdownListParam(params, filters?.dropdown);

  return resolveDropdownListPages({
    dropdown: filters?.dropdown,
    fetchFirst: async () => {
      const { data } = await api.get<LabourTypeListResponse>(LABOUR_TYPE_PATHS.list, { params });
      return parseListApiPage(data, pageSize);
    },
  });
}

export async function fetchLabourType(id: number): Promise<LabourType> {
  const { data } = await api.get<ApiEnvelope<LabourType>>(LABOUR_TYPE_PATHS.detail(id));
  assertApiSuccess(data);
  return data.data;
}

export async function createLabourType(body: LabourTypeCreatePayload): Promise<LabourType> {
  const { data } = await api.post<ApiEnvelope<LabourType>>(
    LABOUR_TYPE_PATHS.list,
    toLabourTypeWritePayload(body),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function updateLabourType(
  id: number,
  body: LabourTypeUpdatePayload,
): Promise<LabourType> {
  const { data } = await api.patch<ApiEnvelope<LabourType>>(
    LABOUR_TYPE_PATHS.detail(id),
    toLabourTypeWritePayload(body),
  );
  assertApiSuccess(data);
  return data.data;
}

export async function deleteLabourType(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(LABOUR_TYPE_PATHS.detail(id));
  assertEnvelopeSuccess(data);
}
