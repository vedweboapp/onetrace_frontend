"use client";

import * as React from "react";
import { Plug } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { connectZohoInventory, fetchZohoConnection } from "@/features/settings/integrations/api/integration.api";
import { buildZohoFrontendCallbackUrl } from "@/features/settings/integrations/utils/zoho-callback-url.util";
import { routes } from "@/shared/config/routes";
import { toastError } from "@/shared/feedback/app-toast";
import { AppButton, ListPageCardGrid, SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

const STATIC_INTEGRATIONS = [{ id: "zoho-inventory", provider: "zoho" as const }] as const;

export function IntegrationsSettingsPanel() {
  const t = useTranslations("Dashboard.integrations");
  const locale = useLocale();
  const router = useRouter();
  const [connectingId, setConnectingId] = React.useState<string | null>(null);
  const [zohoConnected, setZohoConnected] = React.useState(false);
  const [checkingConnection, setCheckingConnection] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const connection = await fetchZohoConnection();
        if (!cancelled) setZohoConnected(connection.connected);
      } catch {
        if (!cancelled) setZohoConnected(false);
      } finally {
        if (!cancelled) setCheckingConnection(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConnect(integrationId: string) {
    if (integrationId !== "zoho-inventory") return;
    setConnectingId(integrationId);
    try {
      const callbackUrl = buildZohoFrontendCallbackUrl(locale);
      const result = await connectZohoInventory(callbackUrl);
      window.location.assign(result.authorization_url!);
    } catch {
      toastError(t("connectError"));
    } finally {
      setConnectingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{t("description")}</p>
      </div>

      <SurfaceShell className="rounded-none">
        <div className="p-4 sm:p-6">
          <ListPageCardGrid className="sm:grid-cols-1 lg:grid-cols-2">
            {STATIC_INTEGRATIONS.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex h-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-950/[0.03]",
                  "dark:border-slate-800 dark:bg-slate-950 dark:ring-white/[0.04]",
                )}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700",
                      "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                    )}
                    aria-hidden
                  >
                    <Plug className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {t("zohoInventory.name")}
                    </span>
                  </span>
                </div>
                {zohoConnected ? (
                  <AppButton
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={checkingConnection}
                    onClick={() => router.push(routes.dashboard.settingsZohoConnection)}
                  >
                    {t("manage")}
                  </AppButton>
                ) : (
                  <AppButton
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={connectingId === item.id || checkingConnection}
                    disabled={checkingConnection || (connectingId != null && connectingId !== item.id)}
                    onClick={() => void handleConnect(item.id)}
                  >
                    {t("connect")}
                  </AppButton>
                )}
              </div>
            ))}
          </ListPageCardGrid>
        </div>
      </SurfaceShell>
    </div>
  );
}
