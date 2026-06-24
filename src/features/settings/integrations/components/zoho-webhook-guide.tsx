"use client";

import * as React from "react";
import { Check, Copy, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ZohoWebhookSetupData } from "@/features/settings/integrations/types/integration.types";
import {
  parseZohoWebhookSamplePayload,
  type ParsedZohoWebhookSamplePayload,
} from "@/features/settings/integrations/utils/zoho-webhook-payload.util";
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

function jsonString(value: string): string {
  return JSON.stringify(value);
}

function HighlightedWebhookPayloadJson({ parsed }: { parsed: ParsedZohoWebhookSamplePayload }) {
  const requiredFields = React.useMemo(
    () => new Set(parsed.fields.filter((row) => row.required).map((row) => row.field)),
    [parsed.fields],
  );

  const fieldKeyClass = (field: string) =>
    cn(
      requiredFields.has(field) &&
        "rounded-sm bg-amber-100/90 px-0.5 font-semibold text-amber-950 dark:bg-amber-950/60 dark:text-amber-100",
    );

  return (
    <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs font-normal leading-relaxed text-slate-800 dark:text-slate-200">
      <span>{"{\n"}</span>
      <span>{`  ${jsonString(parsed.rootKey)}: [\n`}</span>
      <span>{"    {\n"}</span>
      {parsed.fields.map((row, index) => (
        <React.Fragment key={row.field}>
          <span>
            {`      `}
            <span className={fieldKeyClass(row.field)}>{jsonString(row.field)}</span>
            {`: ${jsonString(row.sampleValue)}`}
            {index < parsed.fields.length - 1 ? "," : ""}
            {"\n"}
          </span>
        </React.Fragment>
      ))}
      <span>{"    }\n"}</span>
      <span>{"  ]\n"}</span>
      <span>{"}"}</span>
    </pre>
  );
}

type ZohoWebhookGuideProps = {
  setup: ZohoWebhookSetupData;
  configureMappingHref?: string;
};

export function ZohoWebhookGuide({ setup, configureMappingHref }: ZohoWebhookGuideProps) {
  const t = useTranslations("Dashboard.integrations.zohoWebhookSetup");
  const tMapping = useTranslations("Dashboard.integrations.zohoKeyMapping");
  const headerEntries = Object.entries(setup.header ?? {});

  const parsed = React.useMemo(
    () => parseZohoWebhookSamplePayload(setup.sample_payload, setup.module ?? setup.resource),
    [setup.sample_payload, setup.module, setup.resource],
  );

  const sampleJson = JSON.stringify(parsed.copyPayload, null, 2);
  const hasRequiredFields = parsed.fields.some((row) => row.required);

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
          label={t("samplePayloadJson")}
          mono
          copyText={sampleJson}
          value={
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200/90 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <HighlightedWebhookPayloadJson parsed={parsed} />
              </div>
              {hasRequiredFields ? (
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t("requiredHighlightLegend")}</p>
              ) : null}
            </div>
          }
        />

        <div className="flex gap-3 rounded-lg border border-sky-200/90 bg-sky-50/80 p-3 dark:border-sky-900/50 dark:bg-sky-950/25">
          <Info className="mt-0.5 size-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
          <div className="min-w-0 text-sm leading-relaxed text-sky-950 dark:text-sky-100">
            <p className="font-medium">{t("mappingNoteTitle")}</p>
            <p className="mt-1 text-sky-900/90 dark:text-sky-100/90">
              {t("mappingNoteBody", { mappingTitle: tMapping("title") })}
              {configureMappingHref ? (
                <>
                  {" "}
                  <Link
                    href={configureMappingHref}
                    className="font-semibold underline underline-offset-2 hover:text-sky-800 dark:hover:text-sky-50"
                  >
                    {t("mappingNoteLink")}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </dl>
    </div>
  );
}
