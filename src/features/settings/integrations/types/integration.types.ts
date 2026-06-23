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
  internal_field: string;
  inetrnal_field?: string;
  internal_field_label: string | null;
  external_field: string;
  external_field_label: string | null;
};

export type ZohoFieldSchema = {
  field: string;
  label: string;
  type: string;
  required?: boolean;
};

export type ZohoExistingMapping = {
  internal_field?: string;
  inetrnal_field?: string;
  internal_field_label: string | null;
  external_field: string;
  external_field_label: string | null;
};

export type ZohoKeyMappingData = {
  external_fields: ZohoFieldSchema[];
  internal_fields: ZohoFieldSchema[];
  existing_mapping: ZohoExistingMapping[];
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
  synced_records?: number;
  last_history_sync?: string | null;
  webhook: ZohoConnectionWebhookStatus;
  connection_created_at?: string;
  connection_created_by?: string;
  next_step: string;
};

export type ZohoMappingRow = {
  id: string;
  externalField: string;
  internalField: string;
};
