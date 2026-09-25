import type { Job } from "@/features/jobs/types/job.types";
import type { QualityAssuranceRecord } from "@/features/jobs/types/quality-assurance.types";

export type PublicQrCodeRef = {
  id?: number | null;
  qr_code_id?: string | null;
  public_uuid?: string | null;
  qr_image?: string | null;
};

export type PublicQrPinStatusRef = {
  id?: number;
  status_name?: string | null;
  bg_colour?: string | null;
  text_colour?: string | null;
};

export type PublicQrPinItemRef = {
  id?: number;
  name?: string | null;
  sku?: string | null;
};

export type PublicQrPinGroupRef = {
  id?: number;
  name?: string | null;
};

export type PublicQrPin = {
  id: number;
  job_pin_id?: number | null;
  location?: string | null;
  description?: string | null;
  quantity?: number | null;
  x_coordinate?: number | null;
  y_coordinate?: number | null;
  qr_code?: PublicQrCodeRef | null;
  item_detail?: PublicQrPinItemRef | null;
  group_detail?: PublicQrPinGroupRef | null;
  status_detail?: PublicQrPinStatusRef | null;
  quality_assurance?: QualityAssuranceRecord | null;
  level_id?: number | null;
  level_name?: string | null;
  plot_id?: number | null;
};

export type PublicQrLevelPlot = {
  id?: number;
  pins?: unknown[];
};

export type PublicQrLevel = {
  id?: number;
  name?: string | null;
  order?: number | null;
  plots?: PublicQrLevelPlot[];
};

/** Job payload from `public/qr/{uuid}/` (may include drawing levels). */
export type PublicQrJob = Job & {
  levels?: PublicQrLevel[] | null;
  qa_status?: string | null;
  timer_summary?: {
    is_running?: boolean;
    active_timer_id?: number | null;
    total_duration_seconds?: number | null;
  } | null;
};

export type PublicQrLookupResult = {
  job: PublicQrJob;
};
