import { isScheduleMockApiEnabled } from "@/features/scheduling/config/schedule-api.config";
import type {
  CreateSchedulePayload,
  CreateWorkerTimeOffPayload,
  Schedule,
  ScheduleListFilters,
  UpdateSchedulePayload,
  WorkerTimeOffListFilters,
} from "@/features/scheduling/types/schedule.types";
import * as mockApi from "@/features/scheduling/api/schedule.mock.api";
import * as realApi from "@/features/scheduling/api/schedule.real.api";

const api = isScheduleMockApiEnabled() ? mockApi : realApi;

export const fetchSchedules = (filters?: ScheduleListFilters): Promise<Schedule[]> =>
  api.fetchSchedules(filters);

export const fetchSchedule = (id: number): Promise<Schedule | null> => api.fetchSchedule(id);

export const createSchedule = (payload: CreateSchedulePayload): Promise<Schedule> =>
  api.createSchedule(payload);

export const updateSchedule = (id: number, payload: UpdateSchedulePayload): Promise<Schedule> =>
  api.updateSchedule(id, payload);

export const deleteSchedule = (id: number): Promise<void> => api.deleteSchedule(id);

export const fetchWorkerTimeOff = (filters?: WorkerTimeOffListFilters) => api.fetchWorkerTimeOff(filters);

export const createWorkerTimeOff = (payload: CreateWorkerTimeOffPayload) => api.createWorkerTimeOff(payload);

export const deleteWorkerTimeOff = (id: number): Promise<void> => api.deleteWorkerTimeOff(id);
