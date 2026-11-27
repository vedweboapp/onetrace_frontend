export const TIMESCALE_OPTIONS = [
  "IMMEDIATE",
  "24 HOURS",
  "7 DAYS",
  "1 MONTH",
  "3 MONTHS",
  "6 MONTHS",
  "12 MONTHS",
] as const;

export const SEVERITY_OPTIONS = [
  "SERIOUS BREACH",
  "MODERATE BREACH",
  "MINOR BREACH",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;

export const MISSING_DATA_OPTIONS = ["skip", "fail", "warn"] as const;

export const TRIGGER_OPERATORS = ["equals", "not_equals", "contains", "in"] as const;

export const EXCLUDED_TRIGGER_FIELD_TYPES = new Set([
  "file_upload",
  "image_upload",
  "multi_image_upload",
  "video_recorder",
  "signature",
]);
