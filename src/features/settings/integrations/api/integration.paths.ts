export const INTEGRATION_PATHS = {
  zohoConnect: "integrations/zoho/connect/",
  zohoCallback: "integrations/zoho/callback/",
  zohoKeyMapping: "integrations/zoho/key-mapping/",
  zohoWebhookSetup: "integrations/zoho/webhook-setup/",
  zohoConnection: "integrations/zoho/connection/",
} as const;

export const ZOHO_RESOURCES = ["items", "customers", "vendors"] as const;
export type ZohoResource = (typeof ZOHO_RESOURCES)[number];
export const ZOHO_DEFAULT_RESOURCE: ZohoResource = "items";
