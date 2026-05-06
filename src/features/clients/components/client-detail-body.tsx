"use client";

import type { Client } from "@/features/clients/types/client.types";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailSectionTitle,
  DetailWideCard,
} from "@/shared/components/layout/detail-metric-card";
import { cn } from "@/core/utils/http.util";


export type ClientsTranslator = (
  key: string,
  values?: Record<string, string | number | boolean | null | undefined>,
) => string;

export function ClientDetailBody({
  detail,
  dateFmt,
  t,
}: {
  detail: Client;
  dateFmt: Intl.DateTimeFormat;
  t: ClientsTranslator;
}) {
  const line1 = detail.address_line_1?.trim() ?? "";
  const line2 = detail.address_line_2?.trim() ?? "";
  const legacyOnly = detail.address?.trim() ?? "";
  const structured =
    !!(line1 || line2 || detail.city?.trim() || detail.state?.trim() || detail.country?.trim() || detail.pincode?.trim());

  const phoneRaw = typeof detail.phone === "string" ? detail.phone.trim() : "";
  const telHref = phoneRaw ? `tel:${phoneRaw.replace(/\s/g, "")}` : null;

  return (
    <DetailPagePadding>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
            detail.is_active
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
          )}
        >
          {detail.is_active ? t("status.active") : t("status.inactive")}
        </span>
      </div>

      <div className="space-y-3">
        <DetailSectionTitle>{t("detail.sectionContact")}</DetailSectionTitle>
        <DetailWideCard label={t("fields.contactPerson")}>
          <span className="font-semibold">{detail.contact_person}</span>
        </DetailWideCard>
        <DetailMetricsGrid>
          <DetailMetricCard label={t("fields.email")}>
            <a
              href={`mailto:${detail.email}`}
              className="break-all font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
            >
              {detail.email}
            </a>
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.phone")}>
            {telHref ? (
              <a href={telHref} className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline">
                {phoneRaw}
              </a>
            ) : (
              <span className="font-medium text-slate-500 dark:text-slate-400">—</span>
            )}
          </DetailMetricCard>
        </DetailMetricsGrid>
      </div>

      <div className="space-y-3">
        <DetailSectionTitle>{t("detail.sectionAddress")}</DetailSectionTitle>
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/60">
          {structured ? (
            <div className="grid gap-3 text-sm leading-relaxed text-slate-800 sm:grid-cols-2 dark:text-slate-200">
              <div className="space-y-2">
                {line1 ? <p>{line1}</p> : null}
                {line2 ? <p>{line2}</p> : null}
              </div>
              <div className="space-y-2">
                <p>{[detail.city?.trim(), detail.state?.trim()].filter(Boolean).join(", ") || "—"}</p>
                <p>{[detail.country?.trim(), detail.pincode?.trim()].filter(Boolean).join(" · ") || "—"}</p>
              </div>
            </div>
          ) : legacyOnly ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">{legacyOnly}</p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>
          )}
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-6 dark:border-slate-800">
        <DetailSectionTitle>{t("detail.sectionRecord")}</DetailSectionTitle>
        <DetailMetricsGrid>
          <DetailMetricCard label={t("fields.createdAt")}>
            <span className="font-medium tabular-nums">{dateFmt.format(new Date(detail.created_at))}</span>
          </DetailMetricCard>
          <DetailMetricCard label={t("fields.updatedAt")}>
            <span className="font-medium tabular-nums">{dateFmt.format(new Date(detail.modified_at))}</span>
          </DetailMetricCard>
          {detail.created_by ? (
            <DetailMetricCard label={t("fields.createdBy")}>
              <span className="block font-medium">{detail.created_by.username}</span>
              <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">
                {detail.created_by.email}
              </span>
            </DetailMetricCard>
          ) : null}
        </DetailMetricsGrid>
      </div>
    </DetailPagePadding>
  );
}
