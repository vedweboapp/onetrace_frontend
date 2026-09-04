export type ScheduleRecurrence = "none" | "daily" | "weekly";

export type Schedule = {
  id: number;
  job_id: number;
  worker_id: number;
  worker_ids: number[];
  client_id: number;
  client_name: string;
  job_title: string;
  job_serial: string | null;
  worker_name: string;
  worker_title: string;
  project_id: number | null;
  project_name: string | null;
  start_at: string;
  end_at: string;
  notes: string | null;
  recurrence: ScheduleRecurrence;
  recurrence_end_at: string | null;
  all_day: boolean;
  status: string;
  created_at: string;
};

export type CreateSchedulePayload = {
  job_id: number;
  worker_id: number;
  worker_ids: number[];
  client_id: number;
  project_id?: number | null;
  start_at: string;
  end_at: string;
  notes?: string | null;
  recurrence?: ScheduleRecurrence;
  recurrence_end_at?: string | null;
  all_day?: boolean;
  /** Optional group context when scheduling a whole user group. */
  group_id?: number | null;
};

export type ScheduleBulkSkipRow = {
  workerId: number;
  workerName: string;
  reason: string;
};

/** Result of create when API may skip unavailable workers in a bulk request. */
export type CreateScheduleResult = {
  schedule: Schedule;
  skipped: ScheduleBulkSkipRow[];
  scheduledWorkerIds: number[];
};

export type UpdateSchedulePayload = Partial<CreateSchedulePayload>;

export type ScheduleListFilters = {
  worker_id?: number;
  client_id?: number;
  job_id?: number;
  project_id?: number;
  /** YYYY-MM-DD inclusive range on schedule start/end overlap. */
  from?: string;
  to?: string;
};

export type WorkerTimeOff = {
  id: number;
  worker_id: number;
  worker_name: string;
  start_at: string;
  end_at: string;
  reason: string;
  created_at: string;
};

export type CreateWorkerTimeOffPayload = {
  worker: number;
  start_at: string;
  end_at: string;
  reason: string;
};

export type WorkerTimeOffListFilters = {
  worker?: number;
  worker_id?: number;
  from?: string;
  to?: string;
};
