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
import { ZohoKeyMappingForm } from "@/features/settings/integrations/components/zoho-key-mapping-screen";
import { buildZohoFrontendCallbackUrl } from "@/features/settings/integrations/utils/zoho-callback-url.util";
import type {
  ZohoConnectionDetails,
  ZohoWebhookSetupData,
} from "@/features/settings/integrations/types/integration.types";
import { routes } from "@/shared/config/routes";
import { toastError } from "@/shared/feedback/app-toast";
import { AppButton, AppTabs, SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";

type TabsType = {
  key: string,
  label: string
}

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
  const tKeyMapping = useTranslations("Dashboard.integrations.zohoKeyMapping");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab")?.toLowerCase();
  const initialTab =
    tabParam === "configure" || tabParam === "configuration"
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
      key:"configure",
      label:"Configuration"
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

  const loadWebhook = React.useCallback(async () => {
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
  }, [webhookSetup, webhookLoading, t]);

  React.useEffect(() => {
    if (activeTab === "webhook") {
      void loadWebhook();
    }
  }, [activeTab, loadWebhook]);

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
    } catch {
      toastError(tIntegrations("connectError"));
    } finally {
      setReconnecting(false);
    }
  }

  return (
    <div className="space-y-6 ">
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
        <SurfaceShell className="rounded-xl w-full sm:w-1/2">
          <div className="w-full space-y-6 p-4 sm:p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">We are working on it</p>
          </div>
        </SurfaceShell>
      ) : activeTab === "webhook" && connection ? (
        <SurfaceShell className="rounded-xl w-full">
          <div className="w-full space-y-6 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("webhookTitle")}</h2>
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveTab("configure");
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
          </div>
        </SurfaceShell>
      ) : activeTab === "configure" && connection ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start w-full">
          {/* Left card: Connection Status / Details (30%) */}
          <SurfaceShell className="rounded-xl w-full lg:w-[30%]">
            <div className="w-full space-y-6 p-4 sm:p-6">
              {connection.next_step ? (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-medium mb-4",
                    connection.connected
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"
                      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200",
                  )}
                >
                  {connection.next_step}
                </div>
              ) : null}

              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
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
                <DetailRow label={t("importedRecords")} value={String(connection.imported_records ?? 0)} />
                <DetailRow
                  label={t("status")}
                  value={
                    <div className="flex flex-col gap-2 items-start xl:flex-row xl:items-center xl:gap-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-block size-2 rounded-full",
                            connection.connected ? "bg-emerald-500" : "bg-red-500",
                          )}
                          aria-hidden="true"
                        />
                        <span className="font-semibold text-xs xl:text-sm">
                          {connection.connected ? t("connected") : t("disconnected")}
                        </span>
                      </div>
                      <AppButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 py-1 text-xs px-2"
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

          {/* Right card: Key Mapping Form (70%) */}
          <SurfaceShell className="rounded-xl w-full lg:w-[70%]">
            <div className="w-full space-y-6 p-4 sm:p-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {tKeyMapping("title")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {tKeyMapping("description")}
                </p>
              </div>
              <ZohoKeyMappingForm
                key={mappingResetNonce}
                showCancelButton={true}
                onCancel={() => setMappingResetNonce((n) => n + 1)}
                onSaveSuccess={() => {
                  void loadConnection();
                }}
              />
            </div>
          </SurfaceShell>
        </div>
      ) : null}
    </div>
  );
}
