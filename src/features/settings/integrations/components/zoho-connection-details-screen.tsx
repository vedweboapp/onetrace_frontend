"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  connectZohoInventory,
  fetchZohoConnection,
  fetchZohoWebhookSetup,
} from "@/features/settings/integrations/api/integration.api";
import { ZOHO_DEFAULT_RESOURCE } from "@/features/settings/integrations/api/integration.paths";
import { ZohoWebhookGuide } from "@/features/settings/integrations/components/zoho-webhook-guide";
import { buildZohoFrontendCallbackUrl } from "@/features/settings/integrations/utils/zoho-callback-url.util";
import type {
  ZohoConnectionDetails,
  ZohoWebhookSetupData,
} from "@/features/settings/integrations/types/integration.types";
import { routes } from "@/shared/config/routes";
import { toastError } from "@/shared/feedback/app-toast";
import { AppButton, SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";

type Panel = "details" | "webhook";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-none border-slate-100 py-3 last:border-0 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function boolLabel(value: boolean, label: (key: "yes" | "no") => string) {
  return value ? label("yes") : label("no");
}

export function ZohoConnectionDetailsScreen() {
  const t = useTranslations("Dashboard.integrations.zohoConnection");
  const tIntegrations = useTranslations("Dashboard.integrations");
  const locale = useLocale();
  const router = useRouter();

  const [panel, setPanel] = React.useState<Panel>("details");
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [connection, setConnection] = React.useState<ZohoConnectionDetails | null>(null);
  const [webhookLoading, setWebhookLoading] = React.useState(false);
  const [webhookError, setWebhookError] = React.useState<string | null>(null);
  const [webhookSetup, setWebhookSetup] = React.useState<ZohoWebhookSetupData | null>(null);
  const [reconnecting, setReconnecting] = React.useState(false);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const loadConnection = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchZohoConnection();
      setConnection(data);
    } catch {
      setLoadError(t("loadError"));
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  async function openWebhookPanel() {
    setPanel("webhook");
    if (webhookSetup || webhookLoading) return;
    setWebhookLoading(true);
    setWebhookError(null);
    try {
      const data = await fetchZohoWebhookSetup(ZOHO_DEFAULT_RESOURCE);
      setWebhookSetup(data);
    } catch {
      setWebhookError(t("webhookLoadError"));
    } finally {
      setWebhookLoading(false);
    }
  }

  function formatWebhookLastReceived(value: string | null | undefined) {
    if (!value?.trim()) return t("notAvailable");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return dateFmt.format(parsed);
  }

  async function handleReconnect() {
    setReconnecting(true);
    try {
      const callbackUrl = buildZohoFrontendCallbackUrl(locale);
      const result = await connectZohoInventory(callbackUrl);
      window.location.assign(result.authorization_url!);
    } catch {
      toastError(tIntegrations("connectError"));
    } finally {
      setReconnecting(false);
    }
  }

  return (
    <div className="space-y-6 py-6">
      <DetailPageHeader
        title={t("title")}
        subtitle={t("description")}
        backHref={routes.dashboard.settingsIntegrations}
        backAriaLabel={t("backToIntegrations")}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{t("description")}</p>
        </div> */}
        <div className="flex flex-wrap gap-2">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            loading={reconnecting}
            disabled={reconnecting}
            onClick={() => void handleReconnect()}
          >
            {t("reconnect")}
          </AppButton>
          <AppButton
            type="button"
            variant={panel === "webhook" ? "primary" : "secondary"}
            size="sm"
            onClick={() => void openWebhookPanel()}
          >
            {t("setupWebhook")}
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push(routes.dashboard.settingsZohoKeyMapping)}
          >
            {t("configureMapping")}
          </AppButton>
        </div>
      </div>

      <SurfaceShell className="rounded-xl w-full sm:w-1/2">
        <div className="w-full space-y-6 p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : loadError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          ) : connection && panel === "details" ? (
            <>
              {connection.next_step ? (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-medium",
                    connection.connected
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"
                      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200",
                  )}
                >
                  {connection.next_step}
                </div>
              ) : null}

              <dl>
                <DetailRow label={t("provider")} value={connection.provider || t("notAvailable")} />
                <DetailRow
                  label={t("connectionId")}
                  value={`#${String(connection.connection_id)}`}
                />
                <DetailRow
                  label={t("zohoOrganizationId")}
                  value={connection.zoho_organization_id || t("notAvailable")}
                />
                <DetailRow
                  label={t("mappingConfigured")}
                  value={boolLabel(connection.mapping_configured, t)}
                />
                <DetailRow label={t("importedRecords")} value={String(connection.imported_records ?? 0)} />
                {/* <DetailRow
                  label={t("webhookConfigured")}
                  value={boolLabel(connection.webhook?.configured ?? false, t)}
                />
                <DetailRow
                  label={t("webhookLastReceived")}
                  value={formatWebhookLastReceived(connection.webhook?.last_received_at)}
                /> */}
                <DetailRow label={t("status")} value={boolLabel(connection.connected, t)} />
              </dl>
            </>
          ) : connection && panel === "webhook" ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("webhookTitle")}</h2>
                <AppButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPanel("details");
                    void loadConnection();
                  }}
                >
                  {t("backToDetails")}
                </AppButton>
              </div>
              {webhookLoading ? (
                <div className="space-y-3">
                  <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                  <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                </div>
              ) : webhookError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{webhookError}</p>
              ) : webhookSetup ? (
                <ZohoWebhookGuide setup={webhookSetup} />
              ) : null}
            </>
          ) : null}


        </div>
      </SurfaceShell>
    </div>
  );
}
