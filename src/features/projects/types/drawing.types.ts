import type { ProjectPagination } from "./project.types";
import type { ItemInstallationTypeRef } from "@/features/items/types/item.types";

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
  status: number | null;
  status_id?: number;
  group?: number | null;
  item?: number | null;
  quantity?: number;
  variation?: boolean;
  location?: number | string;
  formId? : number | null;
  project_form? : number | null;

  /** Optional description shown in the pin details panel. */
  description?: string | null;

  /** Optional attachments (may be returned as URLs by the backend or as data URLs from the editor draft). */
  attachments?: DrawingPinAttachment[] | null;

  item_detail?: {
    id: number;
    name: string;
    sku: string;
    is_composite: boolean;
    installation_type?: number | ItemInstallationTypeRef | null;
  } | null;
  group_detail?: any;
  status_detail?: {
    id: number;
    status_name: string;
    bg_colour: string;
    text_colour: string;
  } | null;
};

export type DrawingPinAttachment = {
  id?: number;
  file_name?: string | null;
  name?: string | null;
  url?: string | null;
  file_url?: string | null;
  content_type?: string | null;
  /**
   * Editor draft format: base64/data-url content so it can be sent back with the pin payload.
   * Backend may ignore or transform it.
   */
  file_data?: string | null;
  data_url?: string | null;
  [key: string]: unknown;
};

export type DrawingPlot = {
  id: number;
  name: string;
  coordinates: number[][];
  pins: DrawingPin[];
  plot_border?: string;
  plot_bg?: string;
};

export type DrawingDetail = Drawing & {
  plots: DrawingPlot[];
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
    item?: number | null;
    quantity?: number;
    location?: number | string;
    project_form?: number | null;

    description?: string | null;
    attachments?: DrawingPinAttachment[] | null;
  }>;
};

export type DrawingListResponse = {
  success: boolean;
  message: string;
  data: Drawing[];
  pagination?: ProjectPagination;
};
