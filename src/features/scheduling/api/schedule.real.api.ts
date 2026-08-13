import api from "@/core/api/axios";
import { assertApiSuccess } from "@/core/types/api.types";
import type { ApiEnvelope } from "@/core/types/api.types";
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

/** Real schedule API — wired when NEXT_PUBLIC_SCHEDULE_USE_MOCK=false. */
export async function fetchSchedules(_filters?: ScheduleListFilters): Promise<Schedule[]> {
  const { data } = await api.get<ApiEnvelope<Schedule[]>>(SCHEDULE_PATHS.list, { skipErrorToast: true });
  assertApiSuccess(data);
  return data.data;
}

export async function fetchSchedule(id: number): Promise<Schedule | null> {
  const { data } = await api.get<ApiEnvelope<Schedule>>(SCHEDULE_PATHS.detail(id), { skipErrorToast: true });
  assertApiSuccess(data);
  return data.data;
}

export async function createSchedule(payload: CreateSchedulePayload): Promise<Schedule> {
  const { data } = await api.post<ApiEnvelope<Schedule>>(SCHEDULE_PATHS.list, payload);
  assertApiSuccess(data);
  return data.data;
}

export async function updateSchedule(id: number, payload: UpdateSchedulePayload): Promise<Schedule> {
  const { data } = await api.patch<ApiEnvelope<Schedule>>(SCHEDULE_PATHS.detail(id), payload);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteSchedule(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<null>>(SCHEDULE_PATHS.detail(id));
  assertApiSuccess(data);
}

export async function fetchWorkerTimeOff(filters?: WorkerTimeOffListFilters): Promise<WorkerTimeOff[]> {
  const { data } = await api.get<ApiEnvelope<WorkerTimeOff[]>>(SCHEDULE_PATHS.timeOffList, {
    params: filters,
    skipErrorToast: true,
  });
  assertApiSuccess(data);
  return data.data;
}

export async function createWorkerTimeOff(payload: CreateWorkerTimeOffPayload): Promise<WorkerTimeOff> {
  const { data } = await api.post<ApiEnvelope<WorkerTimeOff>>(SCHEDULE_PATHS.timeOffList, payload);
  assertApiSuccess(data);
  return data.data;
}

export async function deleteWorkerTimeOff(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<null>>(SCHEDULE_PATHS.timeOffDetail(id));
  assertApiSuccess(data);
}
