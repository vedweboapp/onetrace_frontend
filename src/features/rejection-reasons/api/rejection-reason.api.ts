import { isRejectionReasonMockApiEnabled } from "@/features/rejection-reasons/config/rejection-reason-api.config";
import type {
  RejectionReason,
  RejectionReasonCreatePayload,
  RejectionReasonUpdatePayload,
} from "@/features/rejection-reasons/types/rejection-reason.types";
import * as mockApi from "@/features/rejection-reasons/api/rejection-reason.mock.api";
import * as realApi from "@/features/rejection-reasons/api/rejection-reason.real.api";

const api = isRejectionReasonMockApiEnabled() ? mockApi : realApi;

export type { RejectionReasonListFilters } from "@/features/rejection-reasons/api/rejection-reason.real.api";

export const fetchRejectionReasonsPage = (
  page?: number,
  pageSize?: number,
  filters?: realApi.RejectionReasonListFilters,
) => api.fetchRejectionReasonsPage(page, pageSize, filters);

export const fetchRejectionReason = (id: number): Promise<RejectionReason> => api.fetchRejectionReason(id);

export const createRejectionReason = (body: RejectionReasonCreatePayload): Promise<RejectionReason> =>
  api.createRejectionReason(body);

export const updateRejectionReason = (
  id: number,
  body: RejectionReasonUpdatePayload,
): Promise<RejectionReason> => api.updateRejectionReason(id, body);

export const deleteRejectionReason = (id: number): Promise<void> => api.deleteRejectionReason(id);
