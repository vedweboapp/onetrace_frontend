"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ExternalLink, MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Job } from "@/features/jobs/types/job.types";
import {
  getJobStatusRow,
  jobClientLabel,
  jobSiteLabel,
} from "@/features/jobs/utils/job-nested-fields.util";
import {
  formatJobSiteAddress,
  getJobMapSkipReason,
  jobToSiteAddressMapPoint,
  type JobMapPin,
  type JobMapSkipReason,
} from "@/features/jobs/utils/job-site-map.util";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import { AppButton } from "@/shared/ui";
import { isGoogleMapsEnabled } from "@/shared/utils/google-maps-loader.util";
import { cn } from "@/core/utils/http.util";

const JobsGoogleMap = dynamic(
  () => import("@/features/jobs/components/jobs-google-map").then((m) => m.JobsGoogleMap),
  { ssr: false, loading: () => <MapSkeleton /> },
);

const JobsLeafletMap = dynamic(
  () => import("@/features/jobs/components/jobs-leaflet-map").then((m) => m.JobsLeafletMap),
  { ssr: false, loading: () => <MapSkeleton /> },
);

function MapSkeleton() {
  return <div className="h-full min-h-[min(56vh,520px)] w-full animate-pulse bg-slate-100 dark:bg-slate-800" />;
}

type UnmappedJobRow = {
  id: number;
  jobLabel: string;
  title: string;
  siteLabel: string;
  addressText: string;
  clientLabel: string;
  reason: JobMapSkipReason;
};

type Props = {
  jobs: Job[];
  onJobClick: (jobId: number) => void;
};

export function JobsMapView({ jobs, onJobClick }: Props) {
  const t = useTranslations("Dashboard.jobs.mapView");
  const [activePinId, setActivePinId] = React.useState<number | null>(null);
  const [panelJobId, setPanelJobId] = React.useState<number | null>(null);
  const [resolvedJobIds, setResolvedJobIds] = React.useState<number[]>([]);
  const [geocodeDone, setGeocodeDone] = React.useState(false);

  const pins = React.useMemo(() => {
    const next: JobMapPin[] = [];
    for (const job of jobs) {
      const pin = jobToSiteAddressMapPoint(job);
      if (pin) next.push(pin);
    }
    return next;
  }, [jobs]);

  const pinJobIdSet = React.useMemo(() => new Set(pins.map((p) => p.jobId)), [pins]);
  const resolvedIdSet = React.useMemo(() => new Set(resolvedJobIds), [resolvedJobIds]);

  const handleResolvedPinsChange = React.useCallback((ids: number[]) => {
    setResolvedJobIds(ids);
    setGeocodeDone(true);
  }, []);

  React.useEffect(() => {
    setResolvedJobIds([]);
    setGeocodeDone(pins.length === 0);
  }, [pins]);

  const unmappedRows = React.useMemo((): UnmappedJobRow[] => {
    const rows: UnmappedJobRow[] = [];
    for (const job of jobs) {
      const serial = job.job_serial_number?.trim();
      const jobLabel = serial || `Job #${job.id}`;
      const site =
        job.site && typeof job.site === "object" && typeof job.site.id === "number"
          ? job.site
          : null;
      const addressText = site ? formatJobSiteAddress(site) : "";
      const siteLabel = jobSiteLabel(job.site);
      const clientLabel = jobClientLabel(job.client);
      const title = job.title?.trim() || "—";

      const preSkip = getJobMapSkipReason(job);
      if (preSkip === "no_address") {
        rows.push({
          id: job.id,
          jobLabel,
          title,
          siteLabel,
          addressText: addressText || "—",
          clientLabel,
          reason: "no_address",
        });
        continue;
      }

      // Had enough address to try map, but geocode/coords did not resolve.
      if (geocodeDone && pinJobIdSet.has(job.id) && !resolvedIdSet.has(job.id)) {
        rows.push({
          id: job.id,
          jobLabel,
          title,
          siteLabel,
          addressText: addressText || "—",
          clientLabel,
          reason: "invalid_address",
        });
      }
    }
    return rows;
  }, [jobs, geocodeDone, pinJobIdSet, resolvedIdSet]);

  const panelJob = panelJobId != null ? jobs.find((j) => j.id === panelJobId) ?? null : null;
  const panelPin = panelJobId != null ? pins.find((p) => p.jobId === panelJobId) ?? null : null;
  const statusRow = panelJob ? getJobStatusRow(panelJob) : null;

  React.useEffect(() => {
    if (panelJobId != null && !jobs.some((j) => j.id === panelJobId)) setPanelJobId(null);
    if (activePinId != null && !jobs.some((j) => j.id === activePinId)) setActivePinId(null);
  }, [jobs, panelJobId, activePinId]);

  const MapComponent = isGoogleMapsEnabled() ? JobsGoogleMap : JobsLeafletMap;
  const showMap = pins.length > 0;

  function reasonLabel(reason: JobMapSkipReason): string {
    return reason === "no_address" ? t("reasonNoAddress") : t("reasonInvalidAddress");
  }

  return (
    <div className="flex w-full flex-col">
      <div className="relative isolate min-h-[min(56vh,520px)] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
        {showMap ? (
          <MapComponent
            pins={pins}
            selectedJobId={activePinId}
            onPinClick={setActivePinId}
            onOpenDetails={setPanelJobId}
            onResolvedPinsChange={handleResolvedPinsChange}
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="flex h-full min-h-[min(56vh,520px)] flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t("emptyTitle")}</p>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{t("emptyDescription")}</p>
          </div>
        )}

        {unmappedRows.length > 0 && showMap ? (
          <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[min(100%,20rem)] rounded-md border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-[11px] text-slate-600 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
            {t("skippedCount", { count: unmappedRows.length })}
          </div>
        ) : null}

        {panelJob && panelPin ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-20 bg-slate-900/20 md:bg-slate-900/10"
              aria-label={t("closePanel")}
              onClick={() => setPanelJobId(null)}
            />
            <aside
              className={cn(
                "absolute inset-y-0 right-0 z-30 flex w-full max-w-[22rem] flex-col border-l border-slate-200 bg-white shadow-xl",
                "dark:border-slate-700 dark:bg-slate-950",
              )}
              role="dialog"
              aria-label={t("panelTitle")}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t("jobId")} #{panelJob.id}
                  </p>
                  <h2 className="mt-0.5 truncate text-base font-semibold text-slate-900 dark:text-slate-50">
                    {panelPin.jobLabel}
                  </h2>
                  {panelJob.title?.trim() && panelJob.title.trim() !== panelPin.jobLabel ? (
                    <p className="mt-0.5 truncate text-xs text-slate-500">{panelJob.title.trim()}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setPanelJobId(null)}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800"
                  aria-label={t("closePanel")}
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {statusRow ? (
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {t("status")}
                    </p>
                    <WorkflowColourStatusChip row={statusRow} />
                  </div>
                ) : null}

                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t("site")}
                  </p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {jobSiteLabel(panelJob.site)}
                  </p>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t("address")}
                  </p>
                  <p className="flex gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
                    <span>{panelPin.addressText || "—"}</span>
                  </p>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t("client")}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {jobClientLabel(panelJob.client)}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                <AppButton type="button" className="w-full" onClick={() => onJobClick(panelJob.id)}>
                  <span className="inline-flex items-center gap-1.5">
                    {t("openJob")}
                    <ExternalLink className="size-3.5" strokeWidth={2} aria-hidden />
                  </span>
                </AppButton>
              </div>
            </aside>
          </>
        ) : null}
      </div>

      {unmappedRows.length > 0 ? (
        <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {t("unmappedTitle")}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t("unmappedDescription", { count: unmappedRows.length })}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-t border-slate-100 text-left text-sm dark:border-slate-800">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 sm:px-6">{t("colJob")}</th>
                  <th className="px-4 py-2.5 sm:px-6">{t("colSite")}</th>
                  <th className="px-4 py-2.5 sm:px-6">{t("colAddress")}</th>
                  <th className="px-4 py-2.5 sm:px-6">{t("colClient")}</th>
                  <th className="px-4 py-2.5 sm:px-6">{t("colReason")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {unmappedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
                    onClick={() => onJobClick(row.id)}
                  >
                    <td className="px-4 py-3 sm:px-6">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-50">{row.jobLabel}</p>
                        {row.title !== "—" && row.title !== row.jobLabel ? (
                          <p className="truncate text-xs text-slate-500">{row.title}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="max-w-[10rem] truncate px-4 py-3 text-slate-700 dark:text-slate-200 sm:px-6">
                      {row.siteLabel || "—"}
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-3 text-slate-600 dark:text-slate-300 sm:px-6">
                      {row.addressText}
                    </td>
                    <td className="max-w-[10rem] truncate px-4 py-3 text-slate-700 dark:text-slate-200 sm:px-6">
                      {row.clientLabel || "—"}
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium",
                          row.reason === "no_address"
                            ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                            : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
                        )}
                      >
                        {reasonLabel(row.reason)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
