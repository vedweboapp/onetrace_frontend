"use client";

import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { fetchZohoWebhookSetup } from "@/features/settings/integrations/api/integration.api";
import { ZOHO_DEFAULT_RESOURCE } from "@/features/settings/integrations/api/integration.paths";
import { ZohoWebhookGuide } from "@/features/settings/integrations/components/zoho-webhook-guide";
import type { ZohoWebhookSetupData } from "@/features/settings/integrations/types/integration.types";
import { routes } from "@/shared/config/routes";
import { AppButton, SurfaceShell } from "@/shared/ui";

export function ZohoWebhookSetupScreen() {
  const t = useTranslations("Dashboard.integrations.zohoWebhookSetup");
  const router = useRouter();

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
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{t("description")}</p>
      </div>

      <SurfaceShell className="rounded-xl">
        <div className="space-y-6 p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : loadError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          ) : setup ? (
            <ZohoWebhookGuide setup={setup} />
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.replace(routes.dashboard.settingsZohoConnection)}
            >
              {t("backToConnection")}
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => router.replace(routes.dashboard.settingsZohoConnection)}
            >
              {t("done")}
            </AppButton>
          </div>
        </div>
      </SurfaceShell>
    </div>
  );
}
