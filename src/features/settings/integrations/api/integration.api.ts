import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";
import type { ApiEnvelope } from "@/core/types/api.types";
import { assertApiSuccess } from "@/core/types/api.types";
import { INTEGRATION_PATHS } from "./integration.paths";
import type { ZohoCallbackParams, ZohoConnectResponse } from "../types/integration.types";

function unwrapZohoConnectPayload(raw: unknown): ZohoConnectResponse {
  if (!raw || typeof raw !== "object") {
    throw new ApiBusinessError("Invalid connect response");
  }

  const envelope = raw as ApiEnvelope<ZohoConnectResponse> & ZohoConnectResponse;
  if (envelope.success === true && envelope.data && typeof envelope.data === "object") {
    return envelope.data;
  }

  return raw as ZohoConnectResponse;
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
