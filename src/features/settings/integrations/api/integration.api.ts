import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { INTEGRATION_PATHS, ZOHO_DEFAULT_RESOURCE } from "./integration.paths";
import type {
  ZohoCallbackParams,
  ZohoConnectResponse,
  ZohoConnectionDetails,
  ZohoKeyMappingData,
  ZohoSaveKeyMappingPayload,
  ZohoSaveKeyMappingResponse,
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

export async function fetchZohoKeyMapping(): Promise<ZohoKeyMappingData> {
  const { data } = await api.get<ApiEnvelope<ZohoKeyMappingData> | ZohoKeyMappingData>(
    INTEGRATION_PATHS.zohoKeyMapping,
    { params: { module: "items" } },
  );

  if (data && typeof data === "object" && "success" in data && data.success === false) {
    assertApiSuccess(data as ApiEnvelope<ZohoKeyMappingData>);
  }

  const payload = unwrapPayload<ZohoKeyMappingData>(data);
  return {
    external_fields: Array.isArray(payload.external_fields) ? payload.external_fields : [],
    internal_fields: Array.isArray(payload.internal_fields) ? payload.internal_fields : [],
    existing_mapping: Array.isArray(payload.existing_mapping) ? payload.existing_mapping : [],
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
