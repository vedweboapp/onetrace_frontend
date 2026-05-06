import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { DRAWING_PATHS } from "./drawing.paths";
import type {
  Drawing,
  DrawingDetail,
  DrawingListResponse,
  DrawingPlotUpsert,
} from "../types/drawing.types";
import type { ProjectPagination } from "../types/project.types";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

function sortDrawings(items: Drawing[]): Drawing[] {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name);
  });
}

function defaultPagination(items: Drawing[]): ProjectPagination {
  return {
    total_records: items.length,
    total_pages: 1,
    current_page: 1,
    page_size: Math.max(items.length, 1),
    next: null,
    previous: null,
  };
}

export async function fetchDrawingsPage(
  projectId: number,
  page = 1,
  pageSize = 100,
  search?: string,
): Promise<{ items: Drawing[]; pagination: ProjectPagination }> {
  const { data } = await api.get<DrawingListResponse>(DRAWING_PATHS.list(projectId), {
    params: {
      page,
      page_size: pageSize,
      ...(search?.trim() ? { search: search.trim() } : {}),
    },
  });
  assertEnvelopeSuccess(data);
  const items = sortDrawings(data.data);
  const pagination = data.pagination ?? defaultPagination(items);
  return { items, pagination };
}

export async function fetchDrawing(projectId: number, drawingId: number): Promise<Drawing> {
  const detail = await fetchDrawingDetail(projectId, drawingId);
  return detail;
}

export async function createDrawing(
  projectId: number,
  body: {
    name: string;
    order: number;
    file: File;
  },
): Promise<Drawing> {
  const fd = new FormData();
  fd.append("name", body.name.trim());
  fd.append("order", String(body.order));
  fd.append("drawing_file", body.file, body.file.name);

  const { data } = await api.post<ApiEnvelope<Drawing>>(DRAWING_PATHS.list(projectId), fd);
  assertApiSuccess(data);
  return data.data;
}

function readDrawingDetailFromResponse(payload: unknown): DrawingDetail {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    const envelope = payload as ApiEnvelope<DrawingDetail>;
    assertApiSuccess(envelope);
    return envelope.data;
  }
  return payload as DrawingDetail;
}

export async function fetchDrawingDetail(projectId: number, drawingId: number): Promise<DrawingDetail> {
  const { data } = await api.get<ApiEnvelope<DrawingDetail> | DrawingDetail>(
    DRAWING_PATHS.detail(projectId, drawingId),
  );
  return readDrawingDetailFromResponse(data);
}

export async function updateDrawingPlots(
  projectId: number,
  drawingId: number,
  body: { plots: DrawingPlotUpsert[] },
): Promise<DrawingDetail> {
  const { data } = await api.put<ApiEnvelope<DrawingDetail> | DrawingDetail>(
    DRAWING_PATHS.detail(projectId, drawingId),
    body,
  );
  return readDrawingDetailFromResponse(data);
}
