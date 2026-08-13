import type {
  CreateSchedulePayload,
  Schedule,
  ScheduleListFilters,
  UpdateSchedulePayload,
} from "@/features/scheduling/types/schedule.types";
import { apiDateToKey } from "@/features/scheduling/utils/scheduling-week.util";

const STORAGE_KEY = "onetrace_mock_schedules_v1";

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
  if (filters?.from || filters?.to) {
    rows = rows.filter((r) => scheduleOverlapsRange(r, filters.from, filters.to));
  }
  return rows.sort((a, b) => a.start_at.localeCompare(b.start_at));
}

export async function fetchSchedule(id: number): Promise<Schedule | null> {
  await delay(80);
  return readAll().find((r) => r.id === id) ?? null;
}

export async function createSchedule(payload: CreateSchedulePayload): Promise<Schedule> {
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
  await delay(120);
  writeAll(readAll().filter((r) => r.id !== id));
}
