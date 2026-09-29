import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import type {
  WorkflowColourStatus,
  WorkflowColourStatusCreatePayload,
  WorkflowColourStatusListResponse,
  WorkflowColourStatusUpdatePayload,
} from "@/shared/types/workflow-colour-status.types";
import {
  applyDropdownListParam,
  resolveDropdownListPages,
  parseListApiPage,
} from "@/shared/utils/list-dropdown-fetch.util";

function assertEnvelopeSuccess(envelope: { success: boolean; message?: string }) {
  if (!envelope.success) {
    const msg = typeof envelope.message === "string" ? envelope.message : "Request failed";
    throw new ApiBusinessError(msg);
  }
}

export type WorkflowColourStatusListFilters = {
  search?: string;
  dropdown?: boolean;
};

export type WorkflowColourStatusApiPaths = {
  list: string;
  detail: (id: number) => string;
};

export function createWorkflowColourStatusApi(
  paths: WorkflowColourStatusApiPaths,
  resolveUrl: (path: string) => string = (path) => path,
) {
  async function fetchPage(
    page = 1,
    pageSize = 20,
    filters?: WorkflowColourStatusListFilters,
  ): Promise<{ items: WorkflowColourStatus[]; pagination: WorkflowColourStatusListResponse["pagination"] }> {
    const params: Record<string, string | number | boolean> = { page, page_size: pageSize };
    const q = filters?.search?.trim();
    if (q) params.search = q;
    applyDropdownListParam(params, filters?.dropdown);

    return resolveDropdownListPages({
      dropdown: filters?.dropdown,
      fetchFirst: async () => {
        const { data } = await api.get<WorkflowColourStatusListResponse>(resolveUrl(paths.list), { params });
        return parseListApiPage(data, pageSize);
      },
    });
  }

  async function create(body: WorkflowColourStatusCreatePayload): Promise<WorkflowColourStatus> {
    const { data } = await api.post<ApiEnvelope<WorkflowColourStatus>>(resolveUrl(paths.list), body);
    assertApiSuccess(data);
    return data.data;
  }

  async function update(
    id: number,
    body: WorkflowColourStatusUpdatePayload,
  ): Promise<WorkflowColourStatus> {
    const { data } = await api.patch<ApiEnvelope<WorkflowColourStatus>>(resolveUrl(paths.detail(id)), body);
    assertApiSuccess(data);
    return data.data;
  }

  async function remove(id: number): Promise<void> {
    const { data } = await api.delete<ApiEnvelope<unknown>>(resolveUrl(paths.detail(id)));
    assertEnvelopeSuccess(data);
  }

  return { fetchPage, create, update, remove };
}
