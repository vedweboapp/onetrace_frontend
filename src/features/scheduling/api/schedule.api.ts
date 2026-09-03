import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { SCHEDULE_PATHS } from "@/features/scheduling/api/schedule.paths";
import type {
  CreateSchedulePayload,
  CreateWorkerTimeOffPayload,
  Schedule,
  ScheduleListFilters,
  UpdateSchedulePayload,
  WorkerTimeOff,
  WorkerTimeOffListFilters,
} from "@/features/scheduling/types/schedule.types";
import {
  normalizeSchedule,
  normalizeScheduleList,
  normalizeWorkerTimeOff,
  normalizeWorkerTimeOffList,
} from "@/features/scheduling/utils/schedule-map.util";

type ListEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T[];
  pagination?: {
    total_pages?: number;
    current_page?: number;
    page_size?: number;
    total_records?: number;
  };
};

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

function toQueryParams(
  filters?: ScheduleListFilters | WorkerTimeOffListFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (!filters) return params;
  if ("worker" in filters && typeof filters.worker === "number") params.worker = filters.worker;
  else if ("worker_id" in filters && typeof filters.worker_id === "number") params.worker_id = filters.worker_id;
  if ("client_id" in filters && typeof filters.client_id === "number") params.client_id = filters.client_id;
  if ("job_id" in filters && typeof filters.job_id === "number") params.job_id = filters.job_id;
  if ("project_id" in filters && typeof filters.project_id === "number") params.project_id = filters.project_id;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  return params;
}

async function fetchAllListRows<T>(
  path: string,
  filters?: ScheduleListFilters | WorkerTimeOffListFilters,
  options?: { silent?: boolean },
): Promise<T[]> {
  const base = toQueryParams(filters);
  const pageSize = 500;
  const all: T[] = [];
  let page = 1;

  while (true) {
    const { data } = await api.get<ListEnvelope<T>>(path, {
      params: { ...base, page, page_size: pageSize },
      skipErrorToast: options?.silent === true,
    });
    assertEnvelopeSuccess(data);
    const rows = Array.isArray(data.data) ? data.data : [];
    all.push(...rows);
    const totalPages = data.pagination?.total_pages ?? 1;
    if (page >= totalPages || rows.length === 0) break;
    page += 1;
  }

  return all;
}

export async function fetchSchedules(filters?: ScheduleListFilters): Promise<Schedule[]> {
  const rows = await fetchAllListRows<unknown>(SCHEDULE_PATHS.list, filters, { silent: true });
  return normalizeScheduleList(rows);
}

export async function fetchSchedule(id: number): Promise<Schedule | null> {
  const { data } = await api.get<ApiEnvelope<unknown>>(SCHEDULE_PATHS.detail(id), { skipErrorToast: true });
  assertApiSuccess(data);
  return normalizeSchedule(data.data);
}

export async function createSchedule(payload: CreateSchedulePayload): Promise<Schedule> {
  const { data } = await api.post<ApiEnvelope<unknown>>(SCHEDULE_PATHS.list, payload);
  assertApiSuccess(data);
  const row = normalizeSchedule(data.data);
  if (!row) throw new ApiBusinessError("Request failed");
  return row;
}

export async function updateSchedule(id: number, payload: UpdateSchedulePayload): Promise<Schedule> {
  const { data } = await api.patch<ApiEnvelope<unknown>>(SCHEDULE_PATHS.detail(id), payload);
  assertApiSuccess(data);
  const row = normalizeSchedule(data.data);
  if (!row) throw new ApiBusinessError("Request failed");
  return row;
}

export async function deleteSchedule(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<null>>(SCHEDULE_PATHS.detail(id));
  assertApiSuccess(data);
}

export async function fetchWorkerTimeOff(filters?: WorkerTimeOffListFilters): Promise<WorkerTimeOff[]> {
  const rows = await fetchAllListRows<unknown>(SCHEDULE_PATHS.timeOffList, filters, { silent: true });
  return normalizeWorkerTimeOffList(rows);
}

export async function createWorkerTimeOff(payload: CreateWorkerTimeOffPayload): Promise<WorkerTimeOff> {
  const { data } = await api.post<ApiEnvelope<unknown>>(SCHEDULE_PATHS.timeOffList, payload);
  assertApiSuccess(data);
  const row = normalizeWorkerTimeOff(data.data);
  if (!row) throw new ApiBusinessError("Request failed");
  return row;
}

export async function deleteWorkerTimeOff(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<null>>(SCHEDULE_PATHS.timeOffDetail(id));
  assertApiSuccess(data);
}
