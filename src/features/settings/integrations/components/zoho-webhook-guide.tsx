"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { ZohoWebhookSetupData } from "@/features/settings/integrations/types/integration.types";
import { cn } from "@/core/utils/http.util";

function WebhookDetailCard({
  label,
  value,
  mono = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40",
        className,
      )}
    >
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={cn(
          "mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100",
          mono && "font-mono text-xs font-normal leading-relaxed",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function ZohoWebhookGuide({ setup }: { setup: ZohoWebhookSetupData }) {
  const t = useTranslations("Dashboard.integrations.zohoWebhookSetup");
  const headerEntries = Object.entries(setup.header ?? {});
  const sampleJson = JSON.stringify(setup.sample_payload ?? {}, null, 2);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
        <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">{t("guideTitle")}</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/90">
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
          <li>{t("step3")}</li>
        </ol>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WebhookDetailCard label={t("method")} value={setup.method} />
        <WebhookDetailCard label={t("resourceAction")} value={setup.module_action} />
      </dl>

      <dl className="space-y-3">
        <WebhookDetailCard label={t("webhookUri")} value={setup.webhook_uri} mono />

        {headerEntries.map(([key, value]) => (
          <WebhookDetailCard key={key} label={t("header", { name: key })} value={value} mono />
        ))}

        <WebhookDetailCard
          label={t("samplePayload")}
          mono
          value={
            <pre className="m-0 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs font-normal leading-relaxed text-slate-800 dark:text-slate-200">
              {sampleJson}
            </pre>
          }
        />
      </dl>
    </div>
  );
}
