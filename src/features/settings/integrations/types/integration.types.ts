export type ZohoConnectResponse = {
  new_connection?: boolean;
  connection_id?: number;
  authorization_url?: string;
};

export type ZohoCallbackParams = {
  code: string;
  state: string;
  accountsServer: string;
  pullHistoricalData: boolean;
};

export type ZohoFieldMapping = {
  external_field: string;
  internal_field: string;
};

export type ZohoKeyMappingData = {
  external_fields: string[];
  internal_fields: string[];
  existing_mapping: Record<string, string>[];
};

export type ZohoSaveKeyMappingPayload = {
  resource: string;
  pull_historical_data: boolean;
  mappings: ZohoFieldMapping[];
};

export type ZohoSaveKeyMappingResponse = {
  success?: boolean;
  message?: string;
  data_synced?: string[];
};

export type ZohoWebhookSetupData = {
  webhook_uri: string;
  header: Record<string, string>;
  method: string;
  resource: string;
  resource_action: string;
  sample_payload: Record<string, unknown>;
};

export type ZohoConnectionWebhookStatus = {
  configured: boolean;
  last_received_at: string | null;
};

export type ZohoConnectionDetails = {
  connected: boolean;
  provider: string;
  connection_id: number;
  zoho_organization_id: string;
  mapping_configured: boolean;
  imported_records: number;
  webhook: ZohoConnectionWebhookStatus;
  next_step: string;
};

export type ZohoMappingRow = {
  id: string;
  externalField: string;
  internalField: string;
};
