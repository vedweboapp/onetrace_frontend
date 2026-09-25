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
  internal_model?: string | null;
  internal_field: string;
  inetrnal_field?: string;
  internal_field_label: string | null;
  internal_group?: string | null;
  external_field: string;
  external_field_label: string | null;
  external_group?: string | null;
};

export type ZohoFieldDef = {
  field: string;
  label: string;
  type: string;
  required?: boolean;
};

/** Flat field schema (legacy) or a single field inside a group. */
export type ZohoFieldSchema = ZohoFieldDef;

/** Grouped field catalog from key-mapping API. */
export type ZohoFieldGroup = {
  group: string;
  label: string;
  internal_model?: string | null;
  fields: ZohoFieldDef[];
  /**
   * Some key-mapping responses incorrectly nest field defs under `type`
   * instead of `fields` (e.g. Client general). Normalized in API layer.
   */
  type?: ZohoFieldDef[] | string;
};

export type ZohoExistingMapping = {
  external_group?: string | null;
  external_field: string;
  external_field_label: string | null;
  internal_model?: string | null;
  internal_group?: string | null;
  internal_field?: string;
  inetrnal_field?: string;
  internal_field_label: string | null;
  is_required?: boolean;
};

export type ZohoKeyMappingData = {
  external_fields: ZohoFieldGroup[];
  internal_fields: ZohoFieldGroup[];
  existing_mapping: ZohoExistingMapping[];
  full_sync_count?: number | null;
  last_synced_at?: string | null;
  mapping_saved?: boolean | null;
};

export type ZohoSyncMode = "full" | "incremental";

export type ZohoSyncJob = {
  id: number;
  resource: string;
  mode: string;
  status: string;
  current_page: number;
  next_page: number;
  processed_count: number;
  created_count: number;
  updated_count: number;
  restored_count: number;
  skipped_count: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type ZohoPullAllRecordsResponse = {
  success?: boolean;
  message?: string;
  job: ZohoSyncJob;
};

export type ZohoSyncJobStatusResponse = {
  success?: boolean;
  job: ZohoSyncJob;
};

export type ZohoSaveKeyMappingPayload = {
  resource: string;
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
  /** @deprecated Prefer `module` from API */
  resource?: string;
  module?: string;
  module_action: string;
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
  internalGroup: string;
  internalField: string;
  externalGroup: string;
  externalField: string;
  /** Required SimHo fields seeded from the catalog — field cannot be cleared. */
  required?: boolean;
};

export type ZohoSyncHistoryDetailsType = "sync_job" | "event_log" | string;

export type ZohoSyncHistorySyncJobDetails = {
  id: number;
  resource?: string | null;
  mode?: string | null;
  status?: string | null;
  processed_count?: number | null;
  created_count?: number | null;
  updated_count?: number | null;
  restored_count?: number | null;
  skipped_count?: number | null;
  error?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration?: string | number | null;
  retry_record_count?: number | null;
};

export type ZohoSyncHistoryEventLogDetails = {
  status?: string | null;
  error?: string | null;
  retry_count?: number | null;
  payload?: Record<string, unknown> | null;
};

export type ZohoSyncHistoryErrorRow = {
  message?: string | null;
  reason?: string | null;
  error_message?: string | null;
  record_id?: string | number | null;
  resource?: string | null;
  resolved_at?: string | null;
  resolved_by_job_id?: number | null;
  created_at?: string | null;
  [key: string]: unknown;
};

export type ZohoSyncHistoryEntry = {
  id: number;
  provider?: string | null;
  resource?: string | null;
  event_type?: string | null;
  created_at: string;
  details_type: ZohoSyncHistoryDetailsType;
  details: ZohoSyncHistorySyncJobDetails | ZohoSyncHistoryEventLogDetails | Record<string, unknown> | null;
  failed_record_count?: number | null;
  errors?: ZohoSyncHistoryErrorRow[] | null;
};

export type ZohoSyncHistoryPage = {
  items: ZohoSyncHistoryEntry[];
  count: number;
  limit: number;
  offset: number;
};
