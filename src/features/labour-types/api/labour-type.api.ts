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

function unwrapLabourType(data: unknown): LabourType {
  const rec = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  if (rec && rec.success === true && rec.data && typeof rec.data === "object" && !Array.isArray(rec.data)) {
    return rec.data as LabourType;
  }
  if (rec && typeof rec.id === "number") {
    return rec as unknown as LabourType;
  }
  assertApiSuccess(data as ApiEnvelope<LabourType>);
  return (data as ApiEnvelope<LabourType>).data;
}

function toLabourTypeWritePayload(
  body: LabourTypeCreatePayload | LabourTypeUpdatePayload,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.name === "string") out.name = body.name;
  if (typeof body.description === "string") out.description = body.description;
  if (body.default_time_hours === null) out.default_time_hours = null;
  else if (typeof body.default_time_hours === "number") out.default_time_hours = body.default_time_hours;
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
  const { data } = await api.get<ApiEnvelope<LabourType> | LabourType>(LABOUR_TYPE_PATHS.detail(id));
  return unwrapLabourType(data);
}

export async function createLabourType(body: LabourTypeCreatePayload): Promise<LabourType> {
  const { data } = await api.post<ApiEnvelope<LabourType> | LabourType>(
    LABOUR_TYPE_PATHS.list,
    toLabourTypeWritePayload(body),
  );
  return unwrapLabourType(data);
}

export async function updateLabourType(
  id: number,
  body: LabourTypeUpdatePayload,
): Promise<LabourType> {
  const { data } = await api.patch<ApiEnvelope<LabourType> | LabourType>(
    LABOUR_TYPE_PATHS.detail(id),
    toLabourTypeWritePayload(body),
  );
  return unwrapLabourType(data);
}

export async function deleteLabourType(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<unknown>>(LABOUR_TYPE_PATHS.detail(id));
  if (data && typeof data === "object" && "success" in data && (data as ApiEnvelope<unknown>).success === false) {
    const msg =
      typeof (data as ApiEnvelope<unknown>).message === "string"
        ? (data as ApiEnvelope<unknown>).message
        : "Request failed";
    throw new ApiBusinessError(msg);
  }
}
