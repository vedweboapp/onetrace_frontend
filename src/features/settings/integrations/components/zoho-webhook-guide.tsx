"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ZohoWebhookSetupData } from "@/features/settings/integrations/types/integration.types";
import { cn } from "@/core/utils/http.util";
import { toastSuccess } from "@/shared/feedback/app-toast";

function WebhookDetailCard({
  label,
  value,
  mono = false,
  copyText,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyText?: string;
  className?: string;
}) {
  const t = useTranslations("Dashboard.integrations.zohoWebhookSetup");
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    if (!copyText?.trim()) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      toastSuccess(t("copied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        {copyText ? (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition",
              "hover:bg-slate-200/80 hover:text-slate-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
              "dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-slate-600",
            )}
            aria-label={t("copy")}
            title={t("copy")}
          >
            {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          </button>
        ) : null}
      </div>
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

function formatHeaderCopyText(header: Record<string, string>): string {
  return Object.entries(header)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
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
        <WebhookDetailCard label={t("webhookUri")} value={setup.webhook_uri} mono copyText={setup.webhook_uri} />

        {headerEntries.length > 0 ? (
          <WebhookDetailCard
            label={t("headerTitle")}
            mono
            copyText={formatHeaderCopyText(setup.header ?? {})}
            value={
              <div className="space-y-2">
                {headerEntries.map(([key, value]) => (
                  <div key={key} className="space-y-0.5">
                    <p className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">{key}</p>
                    <p className="break-all font-mono text-xs font-normal leading-relaxed text-slate-900 dark:text-slate-100">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            }
          />
        ) : null}

        <WebhookDetailCard
          label={t("samplePayload")}
          mono
          copyText={sampleJson}
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
