import type { Schedule, WorkerTimeOff } from "@/features/scheduling/types/schedule.types";

type NamedRef = {
  id?: number | string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
};

type JobRef = {
  id?: number | string | null;
  job_serial_number?: string | null;
  job_serial?: string | null;
  title?: string | null;
  description?: string | null;
};

type ScheduleApiRow = {
  id?: number | string | null;
  start_at?: string | null;
  end_at?: string | null;
  all_day?: boolean | null;
  notes?: string | null;
  recurrence?: Schedule["recurrence"] | null;
  recurrence_end_at?: string | null;
  status?: string | null;
  created_at?: string | null;
  job_id?: number | string | null;
  job_title?: string | null;
  job_serial?: string | null;
  job?: JobRef | number | null;
  job_detail?: JobRef | null;
  client_id?: number | string | null;
  client_name?: string | null;
  client?: NamedRef | number | null;
  client_detail?: NamedRef | null;
  project_id?: number | string | null;
  project?: NamedRef | number | null;
  project_detail?: NamedRef | null;
  worker_id?: number | string | null;
  worker_name?: string | null;
  worker_title?: string | null;
  worker?: NamedRef | number | null;
  worker_detail?: NamedRef | null;
  worker_details?: NamedRef[] | null;
  workers?: NamedRef[] | number[] | null;
};

type TimeOffApiRow = {
  id?: number | string | null;
  worker_id?: number | string | null;
  worker_name?: string | null;
  worker?: NamedRef | number | null;
  worker_detail?: NamedRef | null;
  worker_details?: NamedRef[] | null;
  start_at?: string | null;
  end_at?: string | null;
  reason?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

function asPositiveId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function nestedId(value: unknown): number | null {
  const direct = asPositiveId(value);
  if (direct) return direct;
  if (value && typeof value === "object" && "id" in value) {
    return asPositiveId((value as { id?: unknown }).id);
  }
  return null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function personName(row: NamedRef | null | undefined): string {
  if (!row) return "";
  const full = `${text(row.first_name)} ${text(row.last_name)}`.trim();
  return full || text(row.name) || text(row.username) || text(row.email);
}

function collectWorkers(raw: ScheduleApiRow | TimeOffApiRow): NamedRef[] {
  const list: NamedRef[] = [];
  const push = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) push(item);
      return;
    }
    if (typeof value === "number" || typeof value === "string") {
      const id = asPositiveId(value);
      if (id) list.push({ id });
      return;
    }
    if (value && typeof value === "object") list.push(value as NamedRef);
  };
  if ("worker_details" in raw) push(raw.worker_details);
  if ("workers" in raw) push(raw.workers);
  push(raw.worker_detail);
  push(raw.worker);
  const workerFieldId =
    "worker" in raw && typeof raw.worker !== "object" ? asPositiveId(raw.worker) : null;
  const flatId = asPositiveId(raw.worker_id) ?? workerFieldId;
  if (flatId && !list.some((row) => nestedId(row) === flatId)) list.push({ id: flatId, name: text(raw.worker_name) });
  return list;
}

export function timeOffWorkerIds(row: Pick<WorkerTimeOff, "worker_id">): number[] {
  return row.worker_id > 0 ? [row.worker_id] : [];
}

export function scheduleWorkerIds(row: Pick<Schedule, "worker_id" | "worker_ids">): number[] {
  if (Array.isArray(row.worker_ids) && row.worker_ids.length > 0) {
    return row.worker_ids.filter((id) => Number.isFinite(id) && id > 0);
  }
  return row.worker_id > 0 ? [row.worker_id] : [];
}

export function scheduleMatchesJob(
  row: Pick<Schedule, "job_id" | "job_serial">,
  jobId?: number | null,
  jobSerial?: string | null,
): boolean {
  const serial = jobSerial?.trim() ?? "";
  const rowSerial = row.job_serial?.trim() ?? "";
  if (serial && rowSerial) return rowSerial === serial;
  return typeof jobId === "number" && jobId > 0 && row.job_id === jobId;
}

export function scheduleJobLabel(row: Pick<Schedule, "job_id" | "job_title" | "job_serial">): string {
  const serial = row.job_serial?.trim() ?? "";
  const title = row.job_title?.trim() ?? "";
  if (serial && title && serial !== title) return `${serial} · ${title}`;
  return serial || title || (row.job_id > 0 ? `Job #${row.job_id}` : "Schedule");
}

export function normalizeSchedule(input: unknown): Schedule | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as ScheduleApiRow;
  const id = asPositiveId(raw.id);
  if (!id) return null;

  const job = raw.job_detail ?? (typeof raw.job === "object" ? raw.job : null);
  const client = raw.client_detail ?? (typeof raw.client === "object" ? raw.client : null);
  const project = raw.project_detail ?? (typeof raw.project === "object" ? raw.project : null);
  const workers = collectWorkers(raw);
  const workerIds = [...new Set(workers.map((row) => nestedId(row)).filter((value): value is number => value != null))];
  const jobId = nestedId(job) ?? nestedId(raw.job) ?? asPositiveId(raw.job_id) ?? 0;
  const serial = text(job?.job_serial_number) || text(job?.job_serial) || text(raw.job_serial) || null;
  const title =
    text(job?.title) ||
    text(job?.description) ||
    text(raw.job_title) ||
    serial ||
    (jobId > 0 ? `Job #${jobId}` : "");
  const workerNames = workers.map(personName).filter(Boolean);

  const startAt = text(raw.start_at);
  const endAt = text(raw.end_at);
  if (!startAt || !endAt) return null;

  return {
    id,
    job_id: jobId,
    worker_id: workerIds[0] ?? asPositiveId(raw.worker_id) ?? 0,
    worker_ids: workerIds,
    client_id: nestedId(client) ?? nestedId(raw.client) ?? asPositiveId(raw.client_id) ?? 0,
    client_name: personName(client) || text(raw.client_name),
    job_title: title,
    job_serial: serial,
    worker_name: workerNames.join(", ") || text(raw.worker_name),
    worker_title: text(raw.worker_title),
    project_id: nestedId(project) ?? nestedId(raw.project) ?? asPositiveId(raw.project_id),
    project_name: text(project?.name) || null,
    start_at: startAt,
    end_at: endAt,
    notes: raw.notes == null ? null : text(raw.notes) || null,
    recurrence: raw.recurrence === "daily" || raw.recurrence === "weekly" ? raw.recurrence : "none",
    recurrence_end_at: raw.recurrence_end_at ? text(raw.recurrence_end_at) : null,
    all_day: raw.all_day === true,
    status: text(raw.status) || "scheduled",
    created_at: text(raw.created_at),
  };
}

export function normalizeScheduleList(input: unknown): Schedule[] {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeSchedule).filter((row): row is Schedule => row != null);
}

export function normalizeWorkerTimeOff(input: unknown): WorkerTimeOff | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as TimeOffApiRow;
  const id = asPositiveId(raw.id);
  const workers = collectWorkers(raw);
  const workerId = nestedId(workers[0]) ?? asPositiveId(raw.worker_id) ?? 0;
  const startAt = text(raw.start_at);
  const endAt = text(raw.end_at);
  if (!id || !startAt || !endAt) return null;
  return {
    id,
    worker_id: workerId,
    worker_name: workers.map(personName).filter(Boolean).join(", ") || text(raw.worker_name),
    start_at: startAt,
    end_at: endAt,
    reason: text(raw.reason) || text(raw.notes),
    created_at: text(raw.created_at),
  };
}

export function normalizeWorkerTimeOffList(input: unknown): WorkerTimeOff[] {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeWorkerTimeOff).filter((row): row is WorkerTimeOff => row != null);
}
