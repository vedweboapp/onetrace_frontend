"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ZohoWebhooksPanel } from "@/features/settings/integrations/components/zoho-webhooks-panel";
import { buildZohoConnectionTabUrl } from "@/features/settings/integrations/utils/zoho-callback-url.util";
import { routes } from "@/shared/config/routes";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { SurfaceShell } from "@/shared/ui";

export function ZohoWebhookSetupScreen() {
  const tResources = useTranslations("Dashboard.integrations.zohoResources");
  const tConnection = useTranslations("Dashboard.integrations.zohoConnection");

  return (
    <div className="space-y-6 py-6">
      <DetailPageHeader
        title={tResources("webhookPageTitle")}
        subtitle={tResources("webhookPageDescription")}
        backHref={routes.dashboard.settingsZohoConnection}
        backAriaLabel={tConnection("backToDetails")}
      />

      <SurfaceShell className="rounded-xl">
        <div className="p-4 sm:p-6">
          <ZohoWebhooksPanel configureMappingHref={buildZohoConnectionTabUrl("configure")} />
        </div>
      </SurfaceShell>
    </div>
  );
}
