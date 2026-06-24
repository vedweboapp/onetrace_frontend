"use client";

import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchZohoWebhookSetup } from "@/features/settings/integrations/api/integration.api";
import { ZOHO_DEFAULT_RESOURCE } from "@/features/settings/integrations/api/integration.paths";
import { ZohoWebhookGuide } from "@/features/settings/integrations/components/zoho-webhook-guide";
import type { ZohoWebhookSetupData } from "@/features/settings/integrations/types/integration.types";
import { routes } from "@/shared/config/routes";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { SurfaceShell } from "@/shared/ui";

export function ZohoWebhookSetupScreen() {
  const t = useTranslations("Dashboard.integrations.zohoWebhookSetup");
  const tConnection = useTranslations("Dashboard.integrations.zohoConnection");

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [setup, setSetup] = React.useState<ZohoWebhookSetupData | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchZohoWebhookSetup(ZOHO_DEFAULT_RESOURCE);
        if (!cancelled) setSetup(data);
      } catch (error) {
        if (!cancelled) setLoadError(getApiErrorDisplayMessage(error, t("loadError")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="space-y-6 py-6">
      <DetailPageHeader
        title={t("title")}
        subtitle={t("description")}
        backHref={routes.dashboard.settingsZohoConnection}
        backAriaLabel={tConnection("backToDetails")}
      />

      <SurfaceShell className="rounded-xl">
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="col-span-full h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : loadError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          ) : setup ? (
            <ZohoWebhookGuide setup={setup} />
          ) : null}
        </div>
      </SurfaceShell>
    </div>
  );
}
