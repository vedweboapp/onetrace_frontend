import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { INTEGRATION_PATHS, ZOHO_DEFAULT_RESOURCE } from "./integration.paths";
import { normalizeFieldGroups } from "../utils/zoho-key-mapping.util";
import type {
  ZohoCallbackParams,
  ZohoConnectResponse,
  ZohoConnectionDetails,
  ZohoKeyMappingData,
  ZohoPullAllRecordsResponse,
  ZohoSaveKeyMappingPayload,
  ZohoSaveKeyMappingResponse,
  ZohoSyncJob,
  ZohoSyncJobStatusResponse,
  ZohoSyncMode,
  ZohoWebhookSetupData,
} from "../types/integration.types";

function unwrapPayload<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object") {
    throw new ApiBusinessError("Invalid response from server");
  }
  const envelope = raw as ApiEnvelope<T> & T;
  if (envelope.success === true && envelope.data && typeof envelope.data === "object") {
    return envelope.data as T;
  }
  return raw as T;
}

function unwrapZohoConnectPayload(raw: unknown): ZohoConnectResponse {
  return unwrapPayload<ZohoConnectResponse>(raw);
}

export async function connectZohoInventory(callbackUrl: string): Promise<ZohoConnectResponse> {
  const { data } = await api.post<ApiEnvelope<ZohoConnectResponse> | ZohoConnectResponse>(
    INTEGRATION_PATHS.zohoConnect,
    { callback_url: callbackUrl },
  );

  if (data && typeof data === "object" && "success" in data && data.success === false) {
    assertApiSuccess(data as ApiEnvelope<ZohoConnectResponse>);
  }

  const payload = unwrapZohoConnectPayload(data);
  const authorizationUrl = payload.authorization_url?.trim();
  if (!authorizationUrl) {
    throw new ApiBusinessError("Authorization URL was not returned by the server");
  }

  return {
    ...payload,
    authorization_url: authorizationUrl,
  };
}

export async function completeZohoIntegration(params: ZohoCallbackParams): Promise<string> {
  const { data } = await api.get<ApiEnvelope<unknown> | Record<string, unknown>>(
    INTEGRATION_PATHS.zohoCallback,
    {
      params: {
        code: params.code,
        state: params.state,
        "accounts-server": params.accountsServer,
        pull_historical_data: params.pullHistoricalData ? "true" : "false",
      },
    },
  );

  if (data && typeof data === "object" && "success" in data) {
    if (data.success === false) {
      assertApiSuccess(data as ApiEnvelope<unknown>);
    }
    const message = typeof data.message === "string" ? data.message.trim() : "";
    return message || "Integration completed successfully";
  }

  return "Integration completed successfully";
}

export async function fetchZohoKeyMapping(
  module: string = ZOHO_DEFAULT_RESOURCE,
): Promise<ZohoKeyMappingData> {
  const { data } = await api.get<ApiEnvelope<ZohoKeyMappingData> | ZohoKeyMappingData>(
    INTEGRATION_PATHS.zohoKeyMapping,
    { params: { module } },
  );

  if (data && typeof data === "object" && "success" in data && data.success === false) {
    assertApiSuccess(data as ApiEnvelope<ZohoKeyMappingData>);
  }

  const payload = unwrapPayload<ZohoKeyMappingData>(data);
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const fullSyncCount =
    typeof payload.full_sync_count === "number"
      ? payload.full_sync_count
      : typeof root.full_sync_count === "number"
        ? root.full_sync_count
        : null;
  const lastSyncedAt =
    typeof payload.last_synced_at === "string"
      ? payload.last_synced_at
      : typeof root.last_synced_at === "string"
        ? root.last_synced_at
        : null;
  const mappingSaved =
    typeof payload.mapping_saved === "boolean"
      ? payload.mapping_saved
      : typeof root.mapping_saved === "boolean"
        ? root.mapping_saved
        : null;
  return {
    external_fields: normalizeFieldGroups(payload.external_fields),
    internal_fields: normalizeFieldGroups(payload.internal_fields),
    existing_mapping: Array.isArray(payload.existing_mapping) ? payload.existing_mapping : [],
    full_sync_count: fullSyncCount,
    last_synced_at: lastSyncedAt,
    mapping_saved: mappingSaved,
  };
}

export async function saveZohoKeyMapping(
  payload: ZohoSaveKeyMappingPayload,
): Promise<ZohoSaveKeyMappingResponse> {
  const { data } = await api.post<ApiEnvelope<ZohoSaveKeyMappingResponse> | ZohoSaveKeyMappingResponse>(
    INTEGRATION_PATHS.zohoKeyMapping,
    payload,
  );

  if (data && typeof data === "object" && "success" in data && data.success === false) {
    assertApiSuccess(data as ApiEnvelope<ZohoSaveKeyMappingResponse>);
  }

  const raw = data as ZohoSaveKeyMappingResponse & ApiEnvelope<ZohoSaveKeyMappingResponse>;
  const nested = raw.data && typeof raw.data === "object" ? raw.data : null;
  return {
    success: raw.success ?? true,
    message:
      (typeof raw.message === "string" ? raw.message : undefined) ??
      (nested && typeof nested.message === "string" ? nested.message : undefined) ??
      "Mapping saved",
    data_synced: Array.isArray(raw.data_synced)
      ? raw.data_synced
      : nested && Array.isArray(nested.data_synced)
        ? nested.data_synced
        : undefined,
  };
}

function readSyncJob(raw: unknown): ZohoSyncJob | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const nested = source.data && typeof source.data === "object" ? (source.data as Record<string, unknown>) : null;
  const jobRaw = (source.job ?? nested?.job) as Record<string, unknown> | undefined;
  if (!jobRaw || typeof jobRaw !== "object") return null;
  const id = Number(jobRaw.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    resource: typeof jobRaw.resource === "string" ? jobRaw.resource : "",
    mode: typeof jobRaw.mode === "string" ? jobRaw.mode : "",
    status: typeof jobRaw.status === "string" ? jobRaw.status : "",
    current_page: Number(jobRaw.current_page) || 0,
    next_page: Number(jobRaw.next_page) || 0,
    processed_count: Number(jobRaw.processed_count) || 0,
    created_count: Number(jobRaw.created_count) || 0,
    updated_count: Number(jobRaw.updated_count) || 0,
    restored_count: Number(jobRaw.restored_count) || 0,
    skipped_count: Number(jobRaw.skipped_count) || 0,
    error: typeof jobRaw.error === "string" ? jobRaw.error : null,
    started_at: typeof jobRaw.started_at === "string" ? jobRaw.started_at : null,
    completed_at: typeof jobRaw.completed_at === "string" ? jobRaw.completed_at : null,
  };
}

export async function pullZohoHistoricalRecords(
  resource: string = ZOHO_DEFAULT_RESOURCE,
  mode: ZohoSyncMode = "full",
): Promise<ZohoPullAllRecordsResponse> {
  const { data } = await api.post<
    ApiEnvelope<ZohoPullAllRecordsResponse> | ZohoPullAllRecordsResponse
  >(INTEGRATION_PATHS.zohoPullAllRecords, {
    resource,
    mode,
  });

  if (data && typeof data === "object" && "success" in data && data.success === false) {
    assertApiSuccess(data as ApiEnvelope<ZohoPullAllRecordsResponse>);
  }

  const job = readSyncJob(data);
  if (!job) {
    throw new ApiBusinessError("Sync job was not returned by the server");
  }
  const raw = data as ZohoPullAllRecordsResponse & ApiEnvelope<ZohoPullAllRecordsResponse>;
  const nested = raw.data && typeof raw.data === "object" ? raw.data : null;
  return {
    success: raw.success ?? true,
    message:
      (typeof raw.message === "string" ? raw.message : undefined) ??
      (nested && typeof nested.message === "string" ? nested.message : undefined) ??
      "Sync job queued",
    job,
  };
}

export async function fetchZohoSyncJobStatus(jobId: number): Promise<ZohoSyncJobStatusResponse> {
  const { data } = await api.get<ApiEnvelope<ZohoSyncJobStatusResponse> | ZohoSyncJobStatusResponse>(
    INTEGRATION_PATHS.zohoSyncJobStatus(jobId),
  );

  if (data && typeof data === "object" && "success" in data && data.success === false) {
    assertApiSuccess(data as ApiEnvelope<ZohoSyncJobStatusResponse>);
  }

  const job = readSyncJob(data);
  if (!job) {
    throw new ApiBusinessError("Sync job status was not returned by the server");
  }
  return {
    success: true,
    job,
  };
}

export async function fetchZohoWebhookSetup(
  resource: string = ZOHO_DEFAULT_RESOURCE,
): Promise<ZohoWebhookSetupData> {
  const { data } = await api.get<ApiEnvelope<ZohoWebhookSetupData> | ZohoWebhookSetupData>(
    INTEGRATION_PATHS.zohoWebhookSetup,
    { params: { resource } },
  );

  if (data && typeof data === "object" && "success" in data && data.success === false) {
    assertApiSuccess(data as ApiEnvelope<ZohoWebhookSetupData>);
  }

  return unwrapPayload<ZohoWebhookSetupData>(data);
}

export async function fetchZohoConnection(): Promise<ZohoConnectionDetails> {
  const { data } = await api.get<ApiEnvelope<ZohoConnectionDetails> | ZohoConnectionDetails>(
    INTEGRATION_PATHS.zohoConnection,
  );

  if (data && typeof data === "object" && "success" in data && data.success === false) {
    assertApiSuccess(data as ApiEnvelope<ZohoConnectionDetails>);
  }

  const payload = unwrapPayload<ZohoConnectionDetails & { mapping_completed?: boolean }>(data);
  return {
    ...payload,
    mapping_configured: payload.mapping_configured ?? payload.mapping_completed ?? false,
  };
}
