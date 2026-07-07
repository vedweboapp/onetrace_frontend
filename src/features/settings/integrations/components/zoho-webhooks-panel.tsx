"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchZohoWebhookSetup } from "@/features/settings/integrations/api/integration.api";
import { ZOHO_RESOURCES, type ZohoResource } from "@/features/settings/integrations/api/integration.paths";
import {
  ZohoWebhookResourceFields,
  ZohoWebhookSharedSetup,
} from "@/features/settings/integrations/components/zoho-webhook-guide";
import type { ZohoWebhookSetupData } from "@/features/settings/integrations/types/integration.types";
import { buildZohoConnectionTabUrl } from "@/features/settings/integrations/utils/zoho-callback-url.util";
import { DetailCollapsibleSection } from "@/shared/components/layout/detail-collapsible-section";
import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";

type ZohoWebhooksPanelProps = {
  refreshKey?: number;
  configureMappingHref?: string;
};

export function ZohoWebhooksPanel({
  refreshKey = 0,
  configureMappingHref = buildZohoConnectionTabUrl("configure"),
}: ZohoWebhooksPanelProps) {
  const tResources = useTranslations("Dashboard.integrations.zohoResources");
  const tWebhook = useTranslations("Dashboard.integrations.zohoWebhookSetup");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [setups, setSetups] = React.useState<Partial<Record<ZohoResource, ZohoWebhookSetupData>>>({});

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          ZOHO_RESOURCES.map(async (resource) => {
            const data = await fetchZohoWebhookSetup(resource);
            return [resource, data] as const;
          }),
        );
        if (!cancelled) {
          setSetups(Object.fromEntries(results) as Partial<Record<ZohoResource, ZohoWebhookSetupData>>);
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorDisplayMessage(err, tWebhook("loadError")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, tWebhook]);

  const sharedSetup = ZOHO_RESOURCES.map((resource) => setups[resource]).find(Boolean) ?? null;

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!sharedSetup) {
    return null;
  }

  return (
    <div className="space-y-8">
      <ZohoWebhookSharedSetup setup={sharedSetup} configureMappingHref={configureMappingHref} />

      <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {tResources("resourceValuesTitle")}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {tResources("resourceValuesDescription")}
          </p>
        </div>

        <div className="space-y-3">
          {ZOHO_RESOURCES.map((resource, index) => {
            const setup = setups[resource];
            if (!setup) return null;

            return (
              <DetailCollapsibleSection
                key={resource}
                title={tResources(`${resource}.title`)}
                defaultOpen={index === 0}
                toggleAriaLabel={tResources(`${resource}.toggleSection`)}
                bodyClassName="pt-4"
              >
                <ZohoWebhookResourceFields setup={setup} />
              </DetailCollapsibleSection>
            );
          })}
        </div>
      </div>
    </div>
  );
}
