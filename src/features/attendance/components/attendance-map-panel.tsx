"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ExternalLink, MapPin, Search, UserRound, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { fetchJob } from "@/features/jobs/api/job.api";
import type { Job } from "@/features/jobs/types/job.types";
import { getOrganizationDetails } from "@/features/settings/company-settings/api/company-settings.api";
import { fetchSchedules } from "@/features/scheduling/api/schedule.api";
import { formatTimeRange, toDateKey } from "@/features/scheduling/utils/scheduling-week.util";
import {
  ATTENDANCE_HQ_PIN_ID,
  buildAttendanceLocations,
  filterAttendanceLocations,
  organizationToHqMapPin,
  type AttendanceLocation,
  type AttendanceLocationFilter,
} from "@/features/attendance/utils/attendance-map.util";
import { routes } from "@/shared/config/routes";
import { dashboardContentHorizontalGutterClassName } from "@/shared/config/dashboard-shell";
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

export function AttendanceMapPanel() {
  const t = useTranslations("Dashboard.attendance");
  const locale = useLocale();
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [locations, setLocations] = React.useState<AttendanceLocation[]>([]);
  const [filter, setFilter] = React.useState<AttendanceLocationFilter>("all");
  const [search, setSearch] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const [activePinId, setActivePinId] = React.useState<number | null>(null);
  const [panelPinId, setPanelPinId] = React.useState<number | null>(null);

  const searchExpanded = searchOpen || search.trim() !== "";

  React.useEffect(() => {
    if (!searchExpanded) return;
    const id = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [searchExpanded]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const today = toDateKey(new Date());
        const [schedules, org] = await Promise.all([
          fetchSchedules({ from: today, to: today }),
          getOrganizationDetails(1).catch(() => null),
        ]);

        const jobIds = [...new Set(schedules.map((s) => s.job_id).filter((id) => id > 0))];
        const jobsById = new Map<number, Job>();
        await Promise.all(
          jobIds.map(async (id) => {
            try {
              const job = await fetchJob(id, { silent: true });
              jobsById.set(id, job);
            } catch {
              /* skip missing jobs */
            }
          }),
        );

        if (cancelled) return;

        const hqPin = org ? organizationToHqMapPin(org, t("companyHq")) : null;
        const next = buildAttendanceLocations({ schedules, jobsById, hqPin });
        setLocations(next);
      } catch {
        if (!cancelled) {
          setError(t("loadError"));
          setLocations([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const visibleLocations = React.useMemo(
    () => filterAttendanceLocations(locations, filter, search),
    [locations, filter, search],
  );

  const pins = React.useMemo(() => visibleLocations.map((loc) => loc.pin), [visibleLocations]);
  const panelLocation =
    panelPinId != null ? visibleLocations.find((loc) => loc.pinId === panelPinId) ?? null : null;

  React.useEffect(() => {
    if (panelPinId != null && !visibleLocations.some((loc) => loc.pinId === panelPinId)) {
      setPanelPinId(null);
    }
    if (activePinId != null && !visibleLocations.some((loc) => loc.pinId === activePinId)) {
      setActivePinId(null);
    }
  }, [visibleLocations, panelPinId, activePinId]);

  const MapComponent = isGoogleMapsEnabled() ? JobsGoogleMap : JobsLeafletMap;
  const showMap = pins.length > 0;
  const displayWorkers = panelLocation?.workers ?? [];

  function openJob(jobId: number) {
    if (jobId <= 0) return;
    router.push(`${routes.dashboard.jobs}/${jobId}`);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-slate-950",
          dashboardContentHorizontalGutterClassName,
        )}
      >
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {searchExpanded ? (
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchPlaceholder")}
                className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-8 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearch("");
                    setSearchOpen(false);
                  }
                }}
              />
              <button
                type="button"
                className="absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label={t("closeSearch")}
                onClick={() => {
                  setSearch("");
                  setSearchOpen(false);
                }}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              title={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500",
                "hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800",
              )}
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-4" strokeWidth={2} />
            </button>
          )}

          <label className="inline-flex min-w-0 items-center gap-2">
            <span className="sr-only">{t("filterLabel")}</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as AttendanceLocationFilter)}
              className="h-9 max-w-[14rem] rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              aria-label={t("filterLabel")}
            >
              <option value="all">{t("filterAll")}</option>
              <option value="hq">{t("filterHq")}</option>
              <option value="job">{t("filterJobs")}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="relative isolate min-h-0 flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900">
        {loading ? (
          <MapSkeleton />
        ) : error ? (
          <div className="flex h-full min-h-[min(56vh,520px)] flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{error}</p>
            <AppButton type="button" variant="secondary" onClick={() => window.location.reload()}>
              {t("retry")}
            </AppButton>
          </div>
        ) : showMap ? (
          <MapComponent
            pins={pins}
            selectedJobId={activePinId ?? panelPinId}
            onPinClick={(jobId) => {
              setActivePinId(jobId);
              setPanelPinId(jobId);
            }}
            onOpenDetails={setPanelPinId}
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="flex h-full min-h-[min(56vh,520px)] flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t("emptyTitle")}</p>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{t("emptyDescription")}</p>
          </div>
        )}

        {panelLocation ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-20 bg-slate-900/20 md:bg-slate-900/10"
              aria-label={t("closePanel")}
              onClick={() => setPanelPinId(null)}
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
                    {panelLocation.kind === "hq" ? t("companyHq") : t("jobLocation")}
                  </p>
                  <h2 className="mt-0.5 truncate text-base font-semibold text-slate-900 dark:text-slate-50">
                    {panelLocation.pin.jobLabel}
                  </h2>
                  {panelLocation.pin.siteName &&
                  panelLocation.kind === "job" &&
                  panelLocation.pin.siteName !== panelLocation.pin.jobLabel ? (
                    <p className="mt-0.5 truncate text-xs text-slate-500">{panelLocation.pin.siteName}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setPanelPinId(null)}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800"
                  aria-label={t("closePanel")}
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t("address")}
                  </p>
                  <p className="flex gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
                    <span>{panelLocation.pin.addressText || "—"}</span>
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {t("workersHere")}
                    </p>
                    <span className="text-[11px] font-medium text-slate-500">
                      {t("workerCount", { count: displayWorkers.length })}
                    </span>
                  </div>

                  {displayWorkers.length === 0 ? (
                    <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      {t("noWorkers")}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {displayWorkers.map((worker) => (
                        <li
                          key={`${worker.scheduleId}-${worker.workerId}`}
                          className="rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/50"
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold uppercase text-white dark:bg-slate-200 dark:text-slate-900"
                              aria-hidden
                            >
                              <UserRound className="size-3.5" strokeWidth={2} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                                  {worker.workerName}
                                </p>
                                {worker.activeNow ? (
                                  <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-[color-mix(in_srgb,var(--dash-accent)_18%,transparent)] text-[var(--dash-accent)]">
                                    {t("workingNow")}
                                  </span>
                                ) : null}
                              </div>
                              {worker.workerTitle ? (
                                <p className="truncate text-xs text-slate-500">{worker.workerTitle}</p>
                              ) : null}
                              <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-300">
                                {worker.jobLabel}
                                {worker.clientName ? ` · ${worker.clientName}` : ""}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {formatTimeRange(worker.startAt, worker.endAt, locale)}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {panelLocation.kind === "job" && panelLocation.pinId !== ATTENDANCE_HQ_PIN_ID ? (
                <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                  <AppButton type="button" className="w-full" onClick={() => openJob(panelLocation.pinId)}>
                    <span className="inline-flex items-center gap-1.5">
                      {t("openJob")}
                      <ExternalLink className="size-3.5" strokeWidth={2} aria-hidden />
                    </span>
                  </AppButton>
                </div>
              ) : null}
            </aside>
          </>
        ) : null}
      </div>
    </div>
  );
}
