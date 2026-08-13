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
import { apiDateToKey } from "@/features/scheduling/utils/scheduling-week.util";
import { emitMockApiNetworkRequest } from "@/shared/config/mock-api-network.util";

const STORAGE_KEY = "onetrace_mock_schedules_v1";
const TIME_OFF_STORAGE_KEY = "onetrace_mock_time_off_v1";

function readAll(): Schedule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Schedule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: Schedule[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function nextId(rows: Schedule[]): number {
  const max = rows.reduce((m, r) => Math.max(m, r.id), 0);
  return max + 1;
}

function scheduleOverlapsRange(schedule: Schedule, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const startKey = apiDateToKey(schedule.start_at);
  const endKey = apiDateToKey(schedule.end_at) ?? startKey;
  if (!startKey) return false;
  const s = startKey;
  const e = endKey && endKey >= startKey ? endKey : startKey;
  if (from && e < from) return false;
  if (to && s > to) return false;
  return true;
}

function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchSchedules(filters?: ScheduleListFilters): Promise<Schedule[]> {
  await emitMockApiNetworkRequest({
    method: "get",
    path: SCHEDULE_PATHS.list,
    params: {
      worker_id: filters?.worker_id,
      client_id: filters?.client_id,
      job_id: filters?.job_id,
      project_id: filters?.project_id,
      from: filters?.from,
      to: filters?.to,
    },
  });
  await delay();
  let rows = readAll();
  if (typeof filters?.worker_id === "number") {
    rows = rows.filter((r) => r.worker_id === filters.worker_id);
  }
  if (typeof filters?.client_id === "number") {
    rows = rows.filter((r) => r.client_id === filters.client_id);
  }
  if (typeof filters?.job_id === "number") {
    rows = rows.filter((r) => r.job_id === filters.job_id);
  }
  if (typeof filters?.project_id === "number") {
    rows = rows.filter((r) => r.project_id === filters.project_id);
  }
  if (filters?.from || filters?.to) {
    rows = rows.filter((r) => scheduleOverlapsRange(r, filters.from, filters.to));
  }
  return rows.sort((a, b) => a.start_at.localeCompare(b.start_at));
}

export async function fetchSchedule(id: number): Promise<Schedule | null> {
  await emitMockApiNetworkRequest({ method: "get", path: SCHEDULE_PATHS.detail(id) });
  await delay(80);
  return readAll().find((r) => r.id === id) ?? null;
}

export async function createSchedule(payload: CreateSchedulePayload): Promise<Schedule> {
  await emitMockApiNetworkRequest({
    method: "post",
    path: SCHEDULE_PATHS.list,
    data: payload,
  });
  await delay(180);
  const rows = readAll();
  const row: Schedule = {
    id: nextId(rows),
    job_id: payload.job_id,
    worker_id: payload.worker_id,
    client_id: payload.client_id,
    client_name: payload.client_name,
    job_title: payload.job_title,
    job_serial: payload.job_serial,
    worker_name: payload.worker_name,
    worker_title: payload.worker_title,
    project_id: payload.project_id ?? null,
    start_at: payload.start_at,
    end_at: payload.end_at,
    notes: payload.notes?.trim() || null,
    recurrence: payload.recurrence ?? "none",
    recurrence_end_at: payload.recurrence_end_at ?? null,
    all_day: Boolean(payload.all_day),
    created_at: new Date().toISOString(),
  };
  writeAll([...rows, row]);
  return row;
}

export async function updateSchedule(id: number, payload: UpdateSchedulePayload): Promise<Schedule> {
  await emitMockApiNetworkRequest({
    method: "patch",
    path: SCHEDULE_PATHS.detail(id),
    data: payload,
  });
  await delay(150);
  const rows = readAll();
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) throw new Error("Schedule not found");
  const current = rows[index]!;
  const updated: Schedule = {
    ...current,
    ...payload,
    notes: payload.notes !== undefined ? (payload.notes?.trim() || null) : current.notes,
  };
  const next = [...rows];
  next[index] = updated;
  writeAll(next);
  return updated;
}

export async function deleteSchedule(id: number): Promise<void> {
  await emitMockApiNetworkRequest({ method: "delete", path: SCHEDULE_PATHS.detail(id) });
  await delay(120);
  writeAll(readAll().filter((r) => r.id !== id));
}

function readTimeOff(): WorkerTimeOff[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TIME_OFF_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkerTimeOff[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTimeOff(rows: WorkerTimeOff[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TIME_OFF_STORAGE_KEY, JSON.stringify(rows));
}

function nextTimeOffId(rows: WorkerTimeOff[]): number {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

function timeOffOverlapsRange(row: WorkerTimeOff, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const startKey = apiDateToKey(row.start_at);
  const endKey = apiDateToKey(row.end_at) ?? startKey;
  if (!startKey) return false;
  const end = endKey && endKey >= startKey ? endKey : startKey;
  if (from && end < from) return false;
  if (to && startKey > to) return false;
  return true;
}

export async function fetchWorkerTimeOff(filters?: WorkerTimeOffListFilters): Promise<WorkerTimeOff[]> {
  await emitMockApiNetworkRequest({
    method: "get",
    path: SCHEDULE_PATHS.timeOffList,
    params: {
      worker_id: filters?.worker_id,
      from: filters?.from,
      to: filters?.to,
    },
  });
  await delay();
  let rows = readTimeOff();
  if (typeof filters?.worker_id === "number") {
    rows = rows.filter((row) => row.worker_id === filters.worker_id);
  }
  if (filters?.from || filters?.to) {
    rows = rows.filter((row) => timeOffOverlapsRange(row, filters.from, filters.to));
  }
  return rows.sort((a, b) => a.start_at.localeCompare(b.start_at));
}

export async function createWorkerTimeOff(payload: CreateWorkerTimeOffPayload): Promise<WorkerTimeOff> {
  await emitMockApiNetworkRequest({
    method: "post",
    path: SCHEDULE_PATHS.timeOffList,
    data: payload,
  });
  await delay(160);
  const rows = readTimeOff();
  const row: WorkerTimeOff = {
    id: nextTimeOffId(rows),
    worker_id: payload.worker_id,
    worker_name: payload.worker_name,
    start_at: payload.start_at,
    end_at: payload.end_at,
    reason: payload.reason.trim(),
    created_at: new Date().toISOString(),
  };
  writeTimeOff([...rows, row]);
  return row;
}

export async function deleteWorkerTimeOff(id: number): Promise<void> {
  await emitMockApiNetworkRequest({ method: "delete", path: SCHEDULE_PATHS.timeOffDetail(id) });
  await delay(120);
  writeTimeOff(readTimeOff().filter((row) => row.id !== id));
}
