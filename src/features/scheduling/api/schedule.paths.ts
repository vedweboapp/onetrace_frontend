export const SCHEDULE_PATHS = {
  list: "schedules/",
  detail: (id: number) => `schedules/${id}/`,
  timeOffList: "schedule-timeoffs/",
  timeOffDetail: (id: number) => `schedule-timeoffs/${id}/`,
} as const;
