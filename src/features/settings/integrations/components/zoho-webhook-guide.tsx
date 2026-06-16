"use client";

import * as React from "react";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ZohoWebhookSetupData } from "@/features/settings/integrations/types/integration.types";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

async function copyText(value: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(value);
    toastSuccess(successMessage);
  } catch {
    toastError("Could not copy to clipboard");
  }
}

function CopyField({
  label,
  value,
  copyLabel,
  copiedMessage,
  monospace = false,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedMessage: string;
  monospace?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className="flex items-start gap-2">
        <code
          className={cn(
            "min-w-0 flex-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
            monospace && "font-mono text-xs",
          )}
        >
          {value}
        </code>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          aria-label={copyLabel}
          onClick={() => void copyText(value, copiedMessage)}
        >
          <Copy className="size-4" aria-hidden />
        </AppButton>
      </div>
    </div>
  );
}

export function ZohoWebhookGuide({ setup }: { setup: ZohoWebhookSetupData }) {
  const t = useTranslations("Dashboard.integrations.zohoWebhookSetup");
  const headerEntries = Object.entries(setup.header ?? {});
  const sampleJson = JSON.stringify(setup.sample_payload ?? {}, null, 2);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-semibold">{t("guideTitle")}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
          <li>{t("step3")}</li>
        </ol>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CopyField
          label={t("method")}
          value={setup.method}
          copyLabel={t("copy")}
          copiedMessage={t("copied")}
        />
        <CopyField
          label={t("resourceAction")}
          value={setup.resource_action}
          copyLabel={t("copy")}
          copiedMessage={t("copied")}
        />
      </div>

      <CopyField
        label={t("webhookUri")}
        value={setup.webhook_uri}
        copyLabel={t("copy")}
        copiedMessage={t("copied")}
        monospace
      />

      {headerEntries.map(([key, value]) => (
        <CopyField
          key={key}
          label={t("header", { name: key })}
          value={value}
          copyLabel={t("copy")}
          copiedMessage={t("copied")}
          monospace
        />
      ))}

      <div className="space-y-1.5">
        <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("samplePayload")}
        </span>
        <div className="flex items-start gap-2">
          <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            {sampleJson}
          </pre>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            aria-label={t("copy")}
            onClick={() => void copyText(sampleJson, t("copied"))}
          >
            <Copy className="size-4" aria-hidden />
          </AppButton>
        </div>
      </div>
    </div>
  );
}
