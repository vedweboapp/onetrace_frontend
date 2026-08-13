export const SCHEDULE_PATHS = {
  list: "schedules/",
  detail: (id: number) => `schedules/${id}/`,
  timeOffList: "schedules/time-off/",
  timeOffDetail: (id: number) => `schedules/time-off/${id}/`,
} as const;
