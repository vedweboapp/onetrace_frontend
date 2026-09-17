"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { Job } from "@/features/jobs/types/job.types";
import { JobsMapJobDetailPanel } from "@/features/jobs/components/jobs-map-job-detail-panel";
import {
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
import { isGoogleMapsEnabled, loadGoogleMaps } from "@/shared/utils/google-maps-loader.util";
import { cn } from "@/core/utils/http.util";

const JobsGoogleMap = dynamic(
  () => import("@/features/jobs/components/jobs-google-map").then((m) => m.JobsGoogleMap),
  { ssr: false, loading: () => <MapLoadingState /> },
);

const JobsLeafletMap = dynamic(
  () => import("@/features/jobs/components/jobs-leaflet-map").then((m) => m.JobsLeafletMap),
  { ssr: false, loading: () => <MapLoadingState /> },
);

function MapLoadingState() {
  const t = useTranslations("Dashboard.jobs.mapView");
  return (
    <div
      className="flex h-full min-h-[min(56vh,520px)] w-full flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="size-8 animate-spin rounded-full border-2 border-slate-300 border-t-[color:var(--dash-accent,#0f766e)] dark:border-slate-600 dark:border-t-[color:var(--dash-accent,#2dd4bf)]" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("loadingMap")}</p>
    </div>
  );
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
  const useGoogle = isGoogleMapsEnabled();

  React.useEffect(() => {
    if (!useGoogle) return;
    void loadGoogleMaps().catch(() => {
      /* JobsGoogleMap shows its own error/empty path */
    });
  }, [useGoogle]);

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

  const handlePinClick = React.useCallback((jobId: number) => {
    setActivePinId(jobId);
    setPanelJobId(jobId);
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

  React.useEffect(() => {
    if (panelJobId != null && !jobs.some((j) => j.id === panelJobId)) setPanelJobId(null);
    if (activePinId != null && !jobs.some((j) => j.id === activePinId)) setActivePinId(null);
  }, [jobs, panelJobId, activePinId]);

  const MapComponent = useGoogle ? JobsGoogleMap : JobsLeafletMap;
  const showMap = pins.length > 0;

  function reasonLabel(reason: JobMapSkipReason): string {
    return reason === "no_address" ? t("reasonNoAddress") : t("reasonInvalidAddress");
  }

  return (
    <div className="flex w-full flex-col">
      <div className="relative isolate min-h-[min(56vh,520px)] w-full shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-900">
        {showMap ? (
          <MapComponent
            pins={pins}
            selectedJobId={activePinId}
            onPinClick={handlePinClick}
            onOpenDetails={setPanelJobId}
            onResolvedPinsChange={handleResolvedPinsChange}
            className="absolute inset-0 h-full w-full ot-jobs-map"
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
      </div>

      <JobsMapJobDetailPanel
        jobId={panelJobId}
        onClose={() => {
          setPanelJobId(null);
          setActivePinId(null);
        }}
        onOpenJob={(id) => {
          setPanelJobId(null);
          onJobClick(id);
        }}
      />

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
