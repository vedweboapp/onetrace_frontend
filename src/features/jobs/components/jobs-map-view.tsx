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
import { jobToSiteAddressMapPoint, type JobMapPin } from "@/features/jobs/utils/job-site-map.util";
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
  return <div className="h-full min-h-[min(72vh,640px)] w-full animate-pulse bg-slate-100 dark:bg-slate-800" />;
}

type Props = {
  jobs: Job[];
  onJobClick: (jobId: number) => void;
};

export function JobsMapView({ jobs, onJobClick }: Props) {
  const t = useTranslations("Dashboard.jobs.mapView");
  const [activePinId, setActivePinId] = React.useState<number | null>(null);
  const [panelJobId, setPanelJobId] = React.useState<number | null>(null);

  const pins = React.useMemo(() => {
    const next: JobMapPin[] = [];
    for (const job of jobs) {
      const pin = jobToSiteAddressMapPoint(job);
      if (pin) next.push(pin);
    }
    return next;
  }, [jobs]);

  const skippedCount = jobs.length - pins.length;
  const panelJob = panelJobId != null ? jobs.find((j) => j.id === panelJobId) ?? null : null;
  const panelPin = panelJobId != null ? pins.find((p) => p.jobId === panelJobId) ?? null : null;
  const statusRow = panelJob ? getJobStatusRow(panelJob) : null;

  React.useEffect(() => {
    if (panelJobId != null && !jobs.some((j) => j.id === panelJobId)) setPanelJobId(null);
    if (activePinId != null && !jobs.some((j) => j.id === activePinId)) setActivePinId(null);
  }, [jobs, panelJobId, activePinId]);

  if (pins.length === 0) {
    return (
      <div className="flex min-h-[min(72vh,640px)] flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t("emptyTitle")}</p>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{t("emptyDescription")}</p>
      </div>
    );
  }

  const MapComponent = isGoogleMapsEnabled() ? JobsGoogleMap : JobsLeafletMap;

  return (
    <div className="relative isolate min-h-[min(72vh,640px)] w-full flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900">
      <MapComponent
        pins={pins}
        selectedJobId={activePinId}
        onPinClick={setActivePinId}
        onOpenDetails={setPanelJobId}
        className="absolute inset-0 h-full w-full"
      />

      {skippedCount > 0 ? (
        <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[min(100%,18rem)] rounded-md border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-[11px] text-slate-600 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
          {t("skippedCount", { count: skippedCount })}
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
  );
}
