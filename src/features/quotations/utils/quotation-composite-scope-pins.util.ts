"use client";

import type { DrawingPin, DrawingPlot } from "@/features/projects/types/drawing.types";

const STORAGE_PREFIX = "onetrace:quotation:scope-pins:";

export type QuotationScopePinDetailRow = {
  pin_id: number | null;
  name: string;
  quantity: number;
  pins_order: number;
  pins_total: number;
  selling_price: number;
  x_coordinate?: number | null;
  y_coordinate?: number | null;
};

export type QuotationScopePinDetailPayload = {
  title: string;
  sectionLabel?: string;
  plotLabel?: string;
  drawingFile?: string | null;
  drawingFileType?: string | null;
  rows: QuotationScopePinDetailRow[];
  selectedPin?: DrawingPin | null;
  plots?: DrawingPlot[];
  drawingName?: string;
  /** The quotation this pin belongs to; populated by the public pin API. */
  quotationId?: number | null;
};

export function saveQuotationScopePinDetails(payload: QuotationScopePinDetailPayload): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(`${STORAGE_PREFIX}${token}`, JSON.stringify(payload));
    return token;
  } catch {
    return null;
  }
}

export function loadQuotationScopePinDetails(token: string | null | undefined): QuotationScopePinDetailPayload | null {
  if (!token || typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${token}`);
    if (!raw) return null;
    return JSON.parse(raw) as QuotationScopePinDetailPayload;
  } catch {
    return null;
  }
}
