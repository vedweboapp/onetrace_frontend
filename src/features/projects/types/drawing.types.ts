import type { ProjectPagination } from "./project.types";

export type DrawingUserRef = {
  id: number;
  email: string;
  username: string;
};

export type Drawing = {
  id: number;
  created_by: DrawingUserRef | null;
  modified_by: DrawingUserRef | null;
  created_at: string;
  modified_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  name: string;
  /** Optional location metadata from API (e.g. block / zone). */
  block?: string | null;
  /** Optional level/phase label from API. */
  level?: string | null;
  order: number;
  drawing_file: string;
  drawing_file_size: number;
  drawing_file_type: string;
  project: number;
  organization: number;
  is_active: boolean;
  deleted_by: unknown;
  pin_count?: number;
  pins_count?: number;
};

export type DrawingPin = {
  id: number;
  x_coordinate: number;
  y_coordinate: number;
  status: string;
  status_id?: number;
  group?: number | null;
  composite_item?: number | null;
  quantity?: number;
};

export type DrawingPlot = {
  id: number;
  name: string;
  coordinates: number[][];
  pins?: DrawingPin[];
  plot_border?: string;
  plot_bg?: string;
};

export type DrawingDetail = Drawing & {
  plots?: DrawingPlot[];
};

export type DrawingPlotUpsert = {
  id?: number;
  name: string;
  coordinates: number[][];
  plot_border?: string;
  plot_bg?: string;
  pins?: Array<{
    id?: number;
    x_coordinate: number;
    y_coordinate: number;
    status?: string | number;
    status_id?: number;
    group?: number | null;
    composite_item?: number | null;
    quantity?: number;
  }>;
};

export type DrawingListResponse = {
  success: boolean;
  message: string;
  data: Drawing[];
  pagination?: ProjectPagination;
};
