"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import {
  connectZohoInventory,
  fetchZohoConnection,
  fetchZohoWebhookSetup,
} from "@/features/settings/integrations/api/integration.api";
import { ZOHO_DEFAULT_RESOURCE } from "@/features/settings/integrations/api/integration.paths";
import { ZohoWebhookGuide } from "@/features/settings/integrations/components/zoho-webhook-guide";
import { ZohoIntegrationGuide } from "@/features/settings/integrations/components/zoho-integration-guide";
import { ZohoKeyMappingForm } from "@/features/settings/integrations/components/zoho-key-mapping-screen";
import { ZohoCallbackFinishModal } from "@/features/settings/integrations/components/zoho-callback-finish-modal";
import { buildZohoConnectionTabUrl, buildZohoFrontendCallbackUrl, readZohoOAuthCallbackParams } from "@/features/settings/integrations/utils/zoho-callback-url.util";
import type {
  ZohoConnectionDetails,
  ZohoWebhookSetupData,
} from "@/features/settings/integrations/types/integration.types";
import { routes } from "@/shared/config/routes";
import { toastError, toastApiError, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { AppButton, AppTabs, SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";

type TabsType = {
  key: string,
  label: string
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function boolLabel(value: boolean, label: (key: "yes" | "no") => string) {
  return value ? label("yes") : label("no");
}

export function ZohoConnectionDetailsScreen() {
  const t = useTranslations("Dashboard.integrations.zohoConnection");
  const tIntegrations = useTranslations("Dashboard.integrations");
  const tKeyMapping = useTranslations("Dashboard.integrations.zohoKeyMapping");
  const tWebhook = useTranslations("Dashboard.integrations.zohoWebhookSetup");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab")?.toLowerCase();
  const oauthParams = readZohoOAuthCallbackParams(searchParams);
  const hasOAuthCallback =
    Boolean(oauthParams.code || oauthParams.state || oauthParams.accountsServer);

  const initialTab =
    hasOAuthCallback
      ? "help"
      : tabParam === "configure" || tabParam === "configuration"
        ? "configure"
        : tabParam === "webhook"
          ? "webhook"
          : tabParam === "help"
            ? "help"
            : "help";

  const [activeTab, setActiveTab] = React.useState<"help" | "configure" | "webhook">(initialTab);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [connection, setConnection] = React.useState<ZohoConnectionDetails | null>(null);
  const [webhookLoading, setWebhookLoading] = React.useState(false);
  const [webhookError, setWebhookError] = React.useState<string | null>(null);
  const [webhookSetup, setWebhookSetup] = React.useState<ZohoWebhookSetupData | null>(null);
  const [reconnecting, setReconnecting] = React.useState(false);
  const [mappingResetNonce, setMappingResetNonce] = React.useState(0);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );
  const tabs: TabsType[] = [
    {
      key: "help",
      label: "Help"
    },
    {
      key: "configure",
      label: "Configuration"
    },
    {
      key: "webhook",
      label: "Webhooks"
    }
  ]
  const loadConnection = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchZohoConnection();
      setConnection(data);
    } catch (error) {
      setLoadError(getApiErrorDisplayMessage(error, t("loadError")));
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  const refetchWebhookSetup = React.useCallback(async () => {
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
  }, [t]);

  React.useEffect(() => {
    if (activeTab === "webhook" && !webhookSetup && !webhookLoading) {
      void refetchWebhookSetup();
    }
  }, [activeTab, webhookSetup, webhookLoading, refetchWebhookSetup]);

  function formatWebhookLastReceived(value: string | null | undefined) {
    if (!value?.trim()) return t("notAvailable");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return dateFmt.format(parsed);
  }

  async function handleReconnect() {
    setReconnecting(true);
    try {
      const callbackUrl = buildZohoFrontendCallbackUrl();
      const result = await connectZohoInventory(callbackUrl);
      window.location.assign(result.authorization_url!);
    } catch (error) {
      toastApiError(error, tIntegrations("connectError"));
    } finally {
      setReconnecting(false);
    }
  }

  React.useEffect(() => {
    if (hasOAuthCallback) {
      setActiveTab("help");
    }
  }, [hasOAuthCallback]);

  function clearOAuthCallbackUrl(tab: "help" | "configure" | "webhook" = "help") {
    router.replace(buildZohoConnectionTabUrl(tab), { scroll: false });
  }

  function handleOAuthSuccess() {
    setActiveTab("configure");
    clearOAuthCallbackUrl("configure");
    void loadConnection();
  }

  function handleOAuthCancel() {
    clearOAuthCallbackUrl("help");
  }

  return (
    <>
      <div
        className={cn(
          "space-y-6",
          hasOAuthCallback && "pointer-events-none select-none blur-[2px] opacity-60",
        )}
      >
      <DetailPageHeader
        title={t("title")}
        subtitle={t("description")}
        backHref={routes.dashboard.settingsIntegrations}
        backAriaLabel={t("backToIntegrations")}
      />

      <AppTabs
        tabs={tabs.map((tab) => ({ id: tab.key, label: tab.label }))}
        value={activeTab}
        onValueChange={(tabId) => {
          setActiveTab(tabId as "help" | "configure" | "webhook");
        }}
        ariaLabel="Zoho connection tabs"
        panelIdPrefix="zoho-connection-tab"
      />

      {loading ? (
        <SurfaceShell className="rounded-xl w-full">
          <div className="w-full space-y-6 p-4 sm:p-6">
            <div className="space-y-3">
              <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        </SurfaceShell>
      ) : loadError ? (
        <SurfaceShell className="rounded-xl w-full">
          <div className="w-full space-y-6 p-4 sm:p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          </div>
        </SurfaceShell>
      ) : activeTab === "help" ? (
        <SurfaceShell className="w-full rounded-xl">
          <div className="w-full space-y-6 p-4 sm:p-6">
            <ZohoIntegrationGuide />
          </div>
        </SurfaceShell>
      ) : activeTab === "webhook" && connection ? (
        <SurfaceShell className="rounded-xl">
          <div className="space-y-6 p-4 sm:p-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("webhookTitle")}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tWebhook("description")}</p>
            </div>
            {webhookLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="col-span-full h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : webhookError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{webhookError}</p>
            ) : webhookSetup ? (
              <ZohoWebhookGuide setup={webhookSetup} configureMappingHref={buildZohoConnectionTabUrl("configure")} />
            ) : null}
          </div>
        </SurfaceShell>
      ) : activeTab === "configure" && connection ? (
        <div className="space-y-6">
          <SurfaceShell className="rounded-xl">
            <div className="space-y-5 p-4 sm:p-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("connectionDetailsTitle")}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("connectionDetailsSubtitle")}</p>
              </div>

              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {/* <DetailRow label={t("provider")} value={connection.provider || t("notAvailable")} /> */}
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
                <DetailRow label={t("importedRecords")} value={String(connection.synced_records ?? 0)} />
                <DetailRow label="Last history sync" value={connection.last_history_sync ? new Date(connection.last_history_sync).toLocaleString() : "Never"} />
                <DetailRow label="Last webhook sync " value={connection?.webhook?.last_received_at ? new Date(connection.webhook.last_received_at).toLocaleString() : "Never"} />
                <DetailRow label="Connection established" value={new Date(connection.connection_created_at ?? 0).toLocaleString()} />
                <DetailRow label="Connected by" value={connection.connection_created_by} />
                <DetailRow
                  label={t("status")}
                  value={
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-block size-2 rounded-full",
                            connection.connected ? "bg-emerald-500" : "bg-red-500",
                          )}
                          aria-hidden="true"
                        />
                        <span>{connection.connected ? t("connected") : t("disconnected")}</span>
                      </div>
                      <AppButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 px-2 py-1 text-xs"
                        loading={reconnecting}
                        disabled={reconnecting}
                        onClick={() => void handleReconnect()}
                      >
                        {t("reconnect")}
                      </AppButton>
                    </div>
                  }
                />
              </dl>
            </div>
          </SurfaceShell>

          <SurfaceShell className="rounded-xl">
            <div className="space-y-6 p-4 sm:p-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tKeyMapping("title")}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tKeyMapping("description")}</p>
              </div>
              <ZohoKeyMappingForm
                key={mappingResetNonce}
                showCancelButton={true}
                onCancel={() => setMappingResetNonce((n) => n + 1)}
                onSaveSuccess={() => {
                  void loadConnection();
                  void refetchWebhookSetup();
                }}
              />
            </div>
          </SurfaceShell>
        </div>
      ) : null}
      </div>

      <ZohoCallbackFinishModal
        open={hasOAuthCallback}
        code={oauthParams.code}
        state={oauthParams.state}
        accountsServer={oauthParams.accountsServer}
        onCancel={handleOAuthCancel}
        onSuccess={handleOAuthSuccess}
      />
    </>
  );
}
