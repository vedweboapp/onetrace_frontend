"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { fetchSchedules } from "@/features/scheduling/api/schedule.mock.api";
import {
  CreateScheduleModal,
  type CreateSchedulePrefill,
  type CreateScheduleTechnician,
} from "@/features/scheduling/components/create-schedule-modal";
import { ScheduleDetailModal } from "@/features/scheduling/components/schedule-detail-modal";
import { SchedulingDayTimeline } from "@/features/scheduling/components/scheduling-day-timeline";
import { useSchedulingCatalog } from "@/features/scheduling/hooks/use-scheduling-catalog";
import type { Schedule } from "@/features/scheduling/types/schedule.types";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import {
  addDays,
  apiDateToKey,
  buildWeekDays,
  formatDayHeader,
  formatMonthDay,
  formatTimeRange,
  formatWeekRangeLabel,
  formatWeekdayShort,
  isSameLocalDay,
  startOfWeekMonday,
  toDateKey,
} from "@/features/scheduling/utils/scheduling-week.util";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { routes } from "@/shared/config/routes";
import { AppButton, CheckmarkSelect } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type ViewMode = "week" | "day";

function startOfLocalDaySafe(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function scheduleOverlapsDay(schedule: Schedule, dayKey: string): boolean {
  const startKey = apiDateToKey(schedule.start_at);
  const endKey = apiDateToKey(schedule.end_at) ?? startKey;
  if (!startKey) return false;
  const end = endKey && endKey >= startKey ? endKey : startKey;
  return dayKey >= startKey && dayKey <= end;
}

export function SchedulingPanel() {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewMode = (searchParams.get("view") === "day" ? "day" : "week") as ViewMode;
  const workerFilter = searchParams.get("worker") ?? "";
  const clientFilter = searchParams.get("client") ?? "";
  const scheduleIdParam = searchParams.get("schedule");

  const [anchorDate, setAnchorDate] = React.useState(() => {
    const dateParam = searchParams.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [y, m, d] = dateParam.split("-").map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1);
    }
    return new Date();
  });

  const [schedules, setSchedules] = React.useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = React.useState(true);
  const [techSearch, setTechSearch] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createTech, setCreateTech] = React.useState<CreateScheduleTechnician | null>(null);
  const [createDateKey, setCreateDateKey] = React.useState(toDateKey(new Date()));
  const [createPrefill, setCreatePrefill] = React.useState<CreateSchedulePrefill | null>(null);

  const [detailSchedule, setDetailSchedule] = React.useState<Schedule | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const { catalog, loading: catalogLoading } = useSchedulingCatalog(
    t("modal.technicianFallbackTitle"),
    t("allClients"),
  );

  const weekStart = React.useMemo(() => startOfWeekMonday(anchorDate), [anchorDate]);
  const days = React.useMemo(
    () => (viewMode === "week" ? buildWeekDays(weekStart) : [startOfLocalDaySafe(anchorDate)]),
    [viewMode, weekStart, anchorDate],
  );

  const rangeFrom = toDateKey(days[0]!);
  const rangeTo = toDateKey(days[days.length - 1]!);

  const rangeLabel =
    viewMode === "week"
      ? formatWeekRangeLabel(weekStart, locale)
      : formatDayHeader(days[0]!, locale, t("today"));

  const reloadSchedules = React.useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const filters: Parameters<typeof fetchSchedules>[0] = { from: rangeFrom, to: rangeTo };
      if (workerFilter && Number.isFinite(Number(workerFilter))) {
        filters.worker_id = Number(workerFilter);
      }
      if (clientFilter && Number.isFinite(Number(clientFilter))) {
        filters.client_id = Number(clientFilter);
      }
      const rows = await fetchSchedules(filters);
      setSchedules(rows);
    } catch (error) {
      toastApiError(error, t("loadError"));
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  }, [rangeFrom, rangeTo, workerFilter, clientFilter, t]);

  React.useEffect(() => {
    void reloadSchedules();
  }, [reloadSchedules, refreshKey]);

  React.useEffect(() => {
    if (!scheduleIdParam) return;
    const id = Number(scheduleIdParam);
    if (!Number.isFinite(id) || id <= 0) return;
    const found = schedules.find((s) => s.id === id);
    if (found) {
      setDetailSchedule(found);
      setDetailOpen(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { fetchSchedule } = await import("@/features/scheduling/api/schedule.mock.api");
      const row = await fetchSchedule(id);
      if (!cancelled && row) {
        setDetailSchedule(row);
        setDetailOpen(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scheduleIdParam, schedules]);

  function patchSearchParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${routes.dashboard.scheduling}?${qs}` : routes.dashboard.scheduling);
  }

  function setViewMode(mode: ViewMode) {
    patchSearchParams({ view: mode === "week" ? null : mode });
  }

  function setClientFilter(value: string) {
    patchSearchParams({ client: value || null });
  }

  function openWorkerCalendar(tech: SchedulingTechnician) {
    patchSearchParams({ worker: String(tech.id), view: "week" });
  }

  function clearWorkerFilter() {
    patchSearchParams({ worker: null });
  }

  const filteredTechs = React.useMemo(() => {
    if (!catalog) return [];
    let rows = catalog.technicians;
    if (workerFilter && Number.isFinite(Number(workerFilter))) {
      rows = rows.filter((r) => r.id === Number(workerFilter));
    }
    const q = techSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.searchText.includes(q));
  }, [catalog, workerFilter, techSearch]);

  const schedulesByWorkerDay = React.useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const schedule of schedules) {
      for (const day of days) {
        const key = toDateKey(day);
        if (!scheduleOverlapsDay(schedule, key)) continue;
        const mapKey = `${schedule.worker_id}:${key}`;
        const list = map.get(mapKey) ?? [];
        list.push(schedule);
        map.set(mapKey, list);
      }
    }
    return map;
  }, [schedules, days]);

  function openCreateSchedule(tech: SchedulingTechnician, day: Date) {
    setCreateTech({ id: tech.id, name: tech.name, title: tech.title, initials: tech.initials });
    setCreateDateKey(toDateKey(day));
    setCreatePrefill(null);
    setCreateOpen(true);
  }

  function openScheduleDetail(schedule: Schedule) {
    setDetailSchedule(schedule);
    setDetailOpen(true);
    patchSearchParams({ schedule: String(schedule.id) });
  }

  function closeScheduleDetail() {
    setDetailOpen(false);
    setDetailSchedule(null);
    patchSearchParams({ schedule: null });
  }

  function onScheduleCreated(id: number) {
    setRefreshKey((k) => k + 1);
    patchSearchParams({ schedule: String(id) });
  }

  function goPrev() {
    setAnchorDate((d) => addDays(d, viewMode === "week" ? -7 : -1));
  }
  function goNext() {
    setAnchorDate((d) => addDays(d, viewMode === "week" ? 7 : 1));
  }
  function goThisWeek() {
    setAnchorDate(new Date());
    setViewMode("week");
  }
  function goToday() {
    setAnchorDate(new Date());
    setViewMode("day");
  }

  const loading = catalogLoading || loadingSchedules;
  const colTemplate = `minmax(220px, 260px) repeat(${days.length}, minmax(140px, 1fr))`;
  const focusedWorker = workerFilter
    ? catalog?.technicians.find((w) => w.id === Number(workerFilter))
    : null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6">
        <div className="flex items-center gap-1">
          <AppButton type="button" variant="secondary" size="sm" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="size-4" />
          </AppButton>
          <AppButton type="button" variant="secondary" size="sm" onClick={goThisWeek}>
            {t("thisWeek")}
          </AppButton>
          <AppButton type="button" variant="secondary" size="sm" onClick={goToday}>
            {t("today")}
          </AppButton>
          <AppButton type="button" variant="secondary" size="sm" onClick={goNext} aria-label="Next">
            <ChevronRight className="size-4" />
          </AppButton>
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{rangeLabel}</p>

        {focusedWorker ? (
          <AppButton type="button" variant="secondary" size="sm" onClick={clearWorkerFilter}>
            {t("allWorkers")}
          </AppButton>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            <button
              type="button"
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold",
                viewMode === "week"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-300",
              )}
              onClick={() => setViewMode("week")}
            >
              {t("viewWeek")}
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold",
                viewMode === "day"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-300",
              )}
              onClick={() => setViewMode("day")}
            >
              {t("viewDay")}
            </button>
          </div>
          <CheckmarkSelect
            listLabel={t("allClients")}
            options={catalog?.clientOptions ?? [{ value: "", label: t("allClients") }]}
            value={clientFilter}
            searchable
            portaled
            className="min-w-[10rem]"
            size="sm"
            onChange={setClientFilter}
          />
        </div>
      </div>

      {viewMode === "day" && days[0] ? (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 px-4 py-2 dark:border-slate-800 sm:px-6">
          {buildWeekDays(startOfWeekMonday(anchorDate)).map((day) => {
            const key = toDateKey(day);
            const selected = isSameLocalDay(day, anchorDate);
            const isToday = isSameLocalDay(day, new Date());
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  "flex min-w-[3.25rem] flex-col items-center rounded-lg border px-2 py-1.5 text-center transition",
                  selected
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                  isToday && !selected && "ring-1 ring-sky-400",
                )}
                onClick={() => setAnchorDate(day)}
              >
                <span className="text-[10px] font-bold uppercase">{formatWeekdayShort(day, locale)}</span>
                <span className="text-sm font-semibold">{day.getDate()}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {viewMode === "day" && days[0] ? (
        loading ? (
          <div className="space-y-2 p-4">
            <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : (
          <SchedulingDayTimeline
            day={days[0]}
            technicians={filteredTechs}
            schedules={schedules}
            onCreateSchedule={openCreateSchedule}
            onScheduleClick={openScheduleDetail}
            onWorkerClick={openWorkerCalendar}
          />
        )
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[720px]">
            <div
              className="sticky top-0 z-20 grid border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              style={{ gridTemplateColumns: colTemplate }}
            >
              <div className="flex items-center gap-2 border-r border-slate-200 px-3 py-3 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("workerColumn")}
                </span>
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={techSearch}
                    placeholder={t("searchTechnicians")}
                    className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    onChange={(e) => setTechSearch(e.target.value)}
                  />
                </div>
              </div>
              {days.map((day) => {
                const isToday = isSameLocalDay(day, new Date());
                return (
                  <div
                    key={toDateKey(day)}
                    className={cn(
                      "border-r border-slate-200 px-3 py-3 text-center last:border-r-0 dark:border-slate-800",
                      isToday && "bg-slate-50 dark:bg-slate-900/60",
                    )}
                  >
                    {isToday ? (
                      <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-slate-900 dark:bg-slate-100" />
                    ) : null}
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {formatWeekdayShort(day, locale)}
                    </p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatMonthDay(day, locale)}
                    </p>
                  </div>
                );
              })}
            </div>

            {loading ? (
              <div className="space-y-2 p-4">
                <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : filteredTechs.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">{t("emptyTechnicians")}</p>
            ) : (
              filteredTechs.map((tech) => (
                <div
                  key={tech.id}
                  className="grid border-b border-slate-100 dark:border-slate-800/80"
                  style={{ gridTemplateColumns: colTemplate }}
                >
                  <div className="flex items-start gap-2.5 border-r border-slate-200 px-3 py-3 dark:border-slate-800">
                    <div
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold uppercase text-white dark:bg-slate-200 dark:text-slate-900"
                      aria-hidden
                    >
                      {tech.initials}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="truncate text-left text-sm font-semibold text-sky-700 hover:underline dark:text-sky-400"
                        onClick={() => openWorkerCalendar(tech)}
                      >
                        {tech.name}
                      </button>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{tech.title}</p>
                    </div>
                  </div>

                  {days.map((day) => {
                    const dayKey = toDateKey(day);
                    const cellSchedules = schedulesByWorkerDay.get(`${tech.id}:${dayKey}`) ?? [];
                    const isToday = isSameLocalDay(day, new Date());
                    return (
                      <div
                        key={`${tech.id}-${dayKey}`}
                        className={cn(
                          "group/cell relative flex min-h-[88px] flex-col border-r border-slate-100 p-2 last:border-r-0 dark:border-slate-800/60",
                          "hover:bg-sky-50/80 dark:hover:bg-sky-950/30",
                          isToday && "bg-slate-50/70 dark:bg-slate-900/40",
                        )}
                      >
                        <div className="space-y-1.5">
                          {cellSchedules.map((schedule) => (
                            <button
                              key={schedule.id}
                              type="button"
                              className="block w-full rounded-md border border-sky-300 bg-sky-50 px-2 py-1.5 text-left transition hover:border-sky-400 dark:border-sky-800 dark:bg-sky-950/40"
                              onClick={() => openScheduleDetail(schedule)}
                            >
                              <p className="truncate text-[11px] font-semibold text-sky-950 dark:text-sky-100">
                                {schedule.job_title}
                              </p>
                              <p className="truncate text-[10px] text-sky-900/80 dark:text-sky-200/80">
                                {schedule.all_day
                                  ? t("detail.allDay")
                                  : formatTimeRange(schedule.start_at, schedule.end_at, locale)}
                              </p>
                              <p className="truncate text-[10px] text-sky-800/70 dark:text-sky-300/70">
                                {schedule.client_name}
                              </p>
                            </button>
                          ))}
                        </div>

                        <div
                          className={cn(
                            "mt-auto flex justify-center pt-2 opacity-0 transition group-hover/cell:opacity-100",
                            cellSchedules.length === 0 && "flex-1 items-center",
                          )}
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
                            onClick={() => openCreateSchedule(tech, day)}
                          >
                            <Plus className="size-3.5" strokeWidth={2.25} />
                            {t("createSchedule")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <CreateScheduleModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        technician={createTech}
        defaultDateKey={createDateKey}
        prefill={createPrefill}
        onCreated={onScheduleCreated}
      />

      <ScheduleDetailModal
        schedule={detailSchedule}
        open={detailOpen}
        onClose={closeScheduleDetail}
        onDeleted={() => {
          setRefreshKey((k) => k + 1);
          closeScheduleDetail();
        }}
        onEdit={() => toastSuccess(t("detail.editSoon"))}
      />
    </div>
  );
}
