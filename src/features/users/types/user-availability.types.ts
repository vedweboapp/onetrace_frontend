export const USER_AVAILABILITY_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type UserAvailabilityDayKey = (typeof USER_AVAILABILITY_DAYS)[number];

export type UserAvailabilityFormRow = {
  day: UserAvailabilityDayKey;
  enabled: boolean;
  start_time: string;
  end_time: string;
};

export type UserAvailabilityPayloadRow = {
  day: UserAvailabilityDayKey;
  start_time: string;
  end_time: string;
};
