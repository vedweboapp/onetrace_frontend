export type ScheduleRecurrence = "none" | "daily" | "weekly";

export type Schedule = {
  id: number;
  job_id: number;
  worker_id: number;
  client_id: number;
  client_name: string;
  job_title: string;
  job_serial: string | null;
  worker_name: string;
  worker_title: string;
  start_at: string;
  end_at: string;
  notes: string | null;
  recurrence: ScheduleRecurrence;
  recurrence_end_at: string | null;
  all_day: boolean;
  created_at: string;
};

export type CreateSchedulePayload = {
  job_id: number;
  worker_id: number;
  client_id: number;
  client_name: string;
  job_title: string;
  job_serial: string | null;
  worker_name: string;
  worker_title: string;
  start_at: string;
  end_at: string;
  notes?: string | null;
  recurrence?: ScheduleRecurrence;
  recurrence_end_at?: string | null;
  all_day?: boolean;
};

export type UpdateSchedulePayload = Partial<CreateSchedulePayload>;

export type ScheduleListFilters = {
  worker_id?: number;
  client_id?: number;
  job_id?: number;
  /** YYYY-MM-DD inclusive range on schedule start/end overlap. */
  from?: string;
  to?: string;
};
