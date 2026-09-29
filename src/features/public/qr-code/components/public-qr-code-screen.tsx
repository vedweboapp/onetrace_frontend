"use client";

import * as React from "react";
import { Loader2, MapPin, QrCode } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fetchPublicQrByUuid } from "@/features/public/qr-code/api/public-qr.api";
import type { PublicQrJob, PublicQrPin } from "@/features/public/qr-code/types/public-qr.types";
import { collectPublicQrPins } from "@/features/public/qr-code/utils/public-qr-response.util";
import {
  getJobAssignedWorkerRows,
  getJobStatusRow,
  jobClientLabel,
  jobProjectLabel,
  jobSiteLabel,
} from "@/features/jobs/utils/job-nested-fields.util";
import { QualityAssuranceStatusBadge } from "@/features/jobs/components/quality-assurance-status";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { DashboardEmptyState } from "@/shared/ui/dashboard-empty-state";
import { cn } from "@/core/utils/http.util";

type Props = {
  qrUuid: string;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-b border-slate-100 py-2.5 last:border-b-0 dark:border-slate-800">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function formatSiteAddress(job: PublicQrJob): string | null {
  const site = job.site;
  if (!site || typeof site !== "object") return null;
  const parts = [
    site.address_line_1,
    site.address_line_2,
    site.city,
    site.state,
    site.zip_code ?? site.pincode,
    site.country,
  ]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function PinStatusChip({ pin }: { pin: PublicQrPin }) {
  const status = pin.status_detail;
  if (!status?.status_name) return <span className="text-slate-400">—</span>;
  return (
    <WorkflowColourStatusChip
      row={{
        status_name: status.status_name,
        bg_colour: status.bg_colour ?? "#e2e8f0",
        text_colour: status.text_colour ?? "#334155",
      }}
    />
  );
}

export function PublicQrCodeScreen({ qrUuid }: Props) {
  const t = useTranslations("Public.qrCode");
  const locale = useLocale();
  const [loading, setLoading] = React.useState(true);
  const [job, setJob] = React.useState<PublicQrJob | null>(null);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [locale],
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setJob(null);

    fetchPublicQrByUuid(qrUuid)
      .then((result) => {
        if (cancelled) return;
        setJob(result.job);
      })
      .catch(() => {
        if (cancelled) return;
        setJob(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [qrUuid]);

  const pins = React.useMemo(() => (job ? collectPublicQrPins(job) : []), [job]);
  const workers = React.useMemo(() => (job ? getJobAssignedWorkerRows(job) : []), [job]);
  const statusRow = job ? getJobStatusRow(job) : null;
  const siteAddress = job ? formatSiteAddress(job) : null;
  const jobTitle =
    job?.title?.trim() ||
    job?.job_serial_number?.trim() ||
    t("untitledJob");

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-10">
        <div className="flex h-14 items-center gap-3">
          <div className="shrink-0 rounded border border-slate-700 bg-black px-2.5 py-1.5">
            <span className="text-base font-bold leading-none tracking-tight text-slate-400">
              RED<span className="text-white">5</span>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-black">
              {loading ? t("title") : job ? jobTitle : t("title")}
            </p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-slate-500">
            <Loader2 className="size-8 animate-spin text-sky-600" strokeWidth={2.25} aria-hidden />
            <p className="text-sm font-medium">{t("loading")}</p>
          </div>
        ) : !job ? (
          <DashboardEmptyState
            icon={QrCode}
            title={t("noDataTitle")}
            description={t("noDataDescription")}
            viewportFill
          />
        ) : (
          <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6 sm:px-6 lg:px-8">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t("jobSection")}
                  </p>
                  <h1 className="mt-1 truncate text-xl font-bold text-slate-900 dark:text-slate-50">
                    {jobTitle}
                  </h1>
                  {job.job_serial_number?.trim() && job.title?.trim() ? (
                    <p className="mt-0.5 font-mono text-sm text-slate-500">{job.job_serial_number}</p>
                  ) : null}
                </div>
                <WorkflowColourStatusChip row={statusRow} fallbackLabel={t("statusUnknown")} />
              </div>

              <dl className="px-4 py-1 sm:px-5">
                <InfoRow label={t("fields.client")} value={jobClientLabel(job.client)} />
                <InfoRow label={t("fields.project")} value={jobProjectLabel(job.project)} />
                <InfoRow label={t("fields.site")} value={jobSiteLabel(job.site)} />
                {siteAddress ? <InfoRow label={t("fields.address")} value={siteAddress} /> : null}
                <InfoRow
                  label={t("fields.startDate")}
                  value={formatFlexibleApiDate(job.start_date, dateFmt) || null}
                />
                <InfoRow
                  label={t("fields.completedAt")}
                  value={formatFlexibleApiDate(job.completed_at, dateFmt) || null}
                />
                <InfoRow
                  label={t("fields.workers")}
                  value={
                    workers.length > 0
                      ? workers.map((w) => w.label).join(", ")
                      : null
                  }
                />
                {job.description?.trim() ? (
                  <InfoRow label={t("fields.description")} value={job.description.trim()} />
                ) : null}
                {job.job_quality_assurance?.status ? (
                  <InfoRow
                    label={t("fields.qualityAssurance")}
                    value={<QualityAssuranceStatusBadge record={job.job_quality_assurance} />}
                  />
                ) : null}
              </dl>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
                <MapPin className="size-4 shrink-0 text-slate-500" strokeWidth={2.25} aria-hidden />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t("pinsSection", { count: pins.length })}
                </h2>
              </div>

              {pins.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-5">{t("noPins")}</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pins.map((pin) => (
                    <li key={pin.id} className="px-4 py-3.5 sm:px-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {pin.item_detail?.name?.trim() ||
                              t("pinFallback", { id: pin.id })}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {[
                              pin.location ? t("pinLocation", { location: pin.location }) : null,
                              pin.level_name,
                              pin.group_detail?.name,
                              pin.qr_code?.qr_code_id
                                ? t("pinQr", { id: pin.qr_code.qr_code_id })
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <PinStatusChip pin={pin} />
                      </div>
                      {pin.quality_assurance?.status ? (
                        <div className="mt-2">
                          <QualityAssuranceStatusBadge record={pin.quality_assurance} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className={cn("pb-4 text-center text-[11px] text-slate-400")}>{t("scanHint")}</p>
          </div>
        )}
      </main>
    </div>
  );
}
