"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, Funnel } from "lucide-react";
import {
  deleteSchedule,
  deleteWorkerTimeOff,
  fetchSchedules,
  fetchSchedule,
  fetchWorkerTimeOff,
  createSchedule,
} from "@/features/scheduling/api/schedule.api";
import {
  CreateScheduleModal,
  type CreateSchedulePrefill,
  type CreateScheduleTechnician,
} from "@/features/scheduling/components/create-schedule-modal";
import {
  MarkUnavailableModal,
  type TimeOffPrefill,
} from "@/features/scheduling/components/mark-unavailable-modal";
import { SchedulingDayAgendaPanel } from "@/features/scheduling/components/scheduling-day-agenda-panel";
import { ScheduleDeleteSummary } from "@/features/scheduling/components/schedule-delete-summary";
import { SchedulingDayTimeline, type TimelineRangeSelect } from "@/features/scheduling/components/scheduling-day-timeline";
import { SchedulingLegend } from "@/features/scheduling/components/scheduling-legend";
import { SchedulingMonthCalendar } from "@/features/scheduling/components/scheduling-month-calendar";
import { SchedulingEmptyUsers } from "@/features/scheduling/components/scheduling-empty-users";
import { SchedulingPeopleHeader } from "@/features/scheduling/components/scheduling-people-header";
import { SchedulingWeekCalendar } from "@/features/scheduling/components/scheduling-week-calendar";
import { SchedulingWeekDayStrip } from "@/features/scheduling/components/scheduling-week-day-strip";
import { useSchedulingCatalog } from "@/features/scheduling/hooks/use-scheduling-catalog";
import type { Schedule, WorkerTimeOff } from "@/features/scheduling/types/schedule.types";
import {
  availabilityHeaderBarClass,
  availabilityToneClass,
  dayTone,
  getDayAvailabilityWindow,
  hasAvailabilityData,
  hasFreeBookableSlot,
  isoOverlaps,
  mergeTones,
  minutesToTime,
  occupiedRangesForDay,
  timeToMinutes,
} from "@/features/scheduling/utils/scheduling-availability.util";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import { rowsForTechnician, technicianMatchesWorkerId, technicianWorkerIds, workerDayRows } from "@/features/scheduling/utils/scheduling-technician.util";
import { scheduleJobLabel, scheduleMatchesJob, scheduleWorkerIds } from "@/features/scheduling/utils/schedule-map.util";
import {
  addDays,
  addMonths,
  apiDateToKey,
  buildMonthGrid,
  buildWeekDays,
  combineDateAndTimeEndToIso,
  combineDateAndTimeToIso,
  formatDayHeader,
  formatMonthYearLabel,
  formatWeekRangeLabel,
  formatWeekdayShort,
  isSameLocalDay,
  startOfWeekMonday,
  toDateKey,
} from "@/features/scheduling/utils/scheduling-week.util";
import { useDashboardChromeStore } from "@/features/dashboard/store/dashboard-chrome.store";
import { toastApiError, toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { dashboardContentHorizontalGutterClassName } from "@/shared/config/dashboard-shell";
import { routes } from "@/shared/config/routes";
import {
  buildCurrentPageBackHref,
  buildPathWithStoredBack,
  pathWithoutQueryAndHash,
} from "@/shared/utils/detail-from-list.util";
import { AppButton, CheckmarkSelect, ConfirmDialog } from "@/shared/ui";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import { cn } from "@/core/utils/http.util";

type ViewMode = "week" | "day" | "month";
type DragMode = "book" | "timeoff";

function parseViewMode(value: string | null): ViewMode {
  if (value === "week") return "week";
  if (value === "month") return "month";
  return "day";
}

export type SchedulingPanelProps = {
  /** Scope the calendar to one worker (e.g. user detail scheduling tab). */
  fixedWorkerId?: number;
  /** Pre-select a job filter (e.g. job detail scheduling tab). */
  defaultJobId?: number;
  /** Client for the job when creating from the job scheduling tab. */
  defaultClientId?: number;
  /** Project for the job when creating from the job scheduling tab. */
  defaultProjectId?: number;
  /** Assigned worker on the job record (fallback when schedule worker ids are missing). */
  defaultAssignedWorkerId?: number;
  /** Job serial (e.g. JB390) used to match schedules when job_id is missing. */
  defaultJobSerial?: string | null;
  /** Sync view/filters to URL search params. Default true on /scheduling. */
  syncUrl?: boolean;
};

function startOfLocalDaySafe(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function scheduleOverlapsDay(schedule: { start_at: string; end_at: string }, dayKey: string): boolean {
  const startKey = apiDateToKey(schedule.start_at);
  const endKey = apiDateToKey(schedule.end_at) ?? startKey;
  if (!startKey) return false;
  const end = endKey && endKey >= startKey ? endKey : startKey;
  return dayKey >= startKey && dayKey <= end;
}

export function SchedulingPanel({
  fixedWorkerId,
  defaultJobId,
  defaultClientId,
  defaultProjectId,
  defaultAssignedWorkerId,
  defaultJobSerial,
  syncUrl = true,
}: SchedulingPanelProps) {
  const t = useTranslations("Dashboard.scheduling");
  const tList = useTranslations("Dashboard.list");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setSecondaryRow = useDashboardChromeStore((s) => s.setSecondaryRow);

  const [localViewMode, setLocalViewMode] = React.useState<ViewMode>("day");
  const [localClientFilter, setLocalClientFilter] = React.useState(() =>
    typeof defaultClientId === "number" && defaultClientId > 0 ? String(defaultClientId) : "",
  );
  const [localJobFilter, setLocalJobFilter] = React.useState(() =>
    typeof defaultJobId === "number" && defaultJobId > 0 ? String(defaultJobId) : "",
  );
  const [localProjectFilter, setLocalProjectFilter] = React.useState("");
  const [localWorkerFilter, setLocalWorkerFilter] = React.useState("");
  const [localGroupFilter, setLocalGroupFilter] = React.useState("");

  const jobScopedId =
    typeof defaultJobId === "number" && defaultJobId > 0 ? defaultJobId : null;
  const jobScopedClientId =
    typeof defaultClientId === "number" && defaultClientId > 0 ? defaultClientId : null;
  const jobScopedProjectId =
    typeof defaultProjectId === "number" && defaultProjectId > 0 ? defaultProjectId : null;

  const viewMode = (
    syncUrl ? parseViewMode(searchParams.get("view")) : localViewMode
  ) as ViewMode;
  const workerFilter = fixedWorkerId
    ? String(fixedWorkerId)
    : syncUrl
      ? (searchParams.get("worker") ?? "")
      : localWorkerFilter;
  const clientFilter = jobScopedClientId
    ? String(jobScopedClientId)
    : syncUrl
      ? (searchParams.get("client") ?? "")
      : localClientFilter;
  const jobFilter = jobScopedId
    ? String(jobScopedId)
    : syncUrl
      ? (searchParams.get("job") ?? "")
      : localJobFilter;
  const projectFilter = syncUrl ? (searchParams.get("project") ?? "") : localProjectFilter;
  const groupFilter = syncUrl ? (searchParams.get("group") ?? "") : localGroupFilter;
  const scheduleIdParam = syncUrl ? searchParams.get("schedule") : null;

  const [anchorDate, setAnchorDate] = React.useState(() => {
    const dateParam = searchParams.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [y, m, d] = dateParam.split("-").map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1);
    }
    return new Date();
  });

  const [schedules, setSchedules] = React.useState<Schedule[]>([]);
  const [jobScopedSchedules, setJobScopedSchedules] = React.useState<Schedule[]>([]);
  const [timeOffs, setTimeOffs] = React.useState<WorkerTimeOff[]>([]);
  const [loadingSchedules, setLoadingSchedules] = React.useState(true);
  const [techSearch, setTechSearch] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [dragMode, setDragMode] = React.useState<DragMode>("book");
  /** Scroll day timeline to this local-midnight minute after create/paste. */
  const [timelineFocusMinutes, setTimelineFocusMinutes] = React.useState<number | null>(null);
  const [timelineFocusWorkerId, setTimelineFocusWorkerId] = React.useState<number | null>(null);
  const [schedulesReady, setSchedulesReady] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createTech, setCreateTech] = React.useState<CreateScheduleTechnician | null>(null);
  const [createDateKey, setCreateDateKey] = React.useState(toDateKey(new Date()));
  const [createPrefill, setCreatePrefill] = React.useState<CreateSchedulePrefill | null>(null);
  const [creatingSchedule, setCreatingSchedule] = React.useState(false);
  const [copiedSchedule, setCopiedSchedule] = React.useState<Schedule | null>(null);
  const [pastingSchedule, setPastingSchedule] = React.useState(false);
  const [timeOffOpen, setTimeOffOpen] = React.useState(false);
  const [timeOffPrefill, setTimeOffPrefill] = React.useState<TimeOffPrefill | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Schedule | null>(null);
  const [deleteTimeOff, setDeleteTimeOff] = React.useState<WorkerTimeOff | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deletingTimeOff, setDeletingTimeOff] = React.useState(false);
  const [agendaDay, setAgendaDay] = React.useState<Date | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const filterAnchorRef = React.useRef<HTMLButtonElement>(null);
  const filterRowRef = React.useRef<HTMLDivElement>(null);

  const { catalog, loading: catalogLoading } = useSchedulingCatalog(t("modal.technicianFallbackTitle"), {
    includeFilters:
      filtersOpen ||
      Boolean((!jobScopedId && (clientFilter || jobFilter)) || projectFilter || groupFilter),
  });

  const weekStart = React.useMemo(() => startOfWeekMonday(anchorDate), [anchorDate]);
  const days = React.useMemo(() => {
    if (viewMode === "week") return buildWeekDays(weekStart);
    if (viewMode === "day") return [startOfLocalDaySafe(anchorDate)];
    return buildMonthGrid(anchorDate);
  }, [viewMode, weekStart, anchorDate]);

  const rangeFrom = toDateKey(days[0]!);
  const rangeTo = toDateKey(days[days.length - 1]!);

  const rangeLabel =
    viewMode === "week"
      ? formatWeekRangeLabel(weekStart, locale)
      : viewMode === "month"
        ? formatMonthYearLabel(anchorDate, locale)
        : formatDayHeader(days[0]!, locale, t("today"));

  const reloadSchedules = React.useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const filters: Parameters<typeof fetchSchedules>[0] = { from: rangeFrom, to: rangeTo };
      if (!jobScopedId && workerFilter && Number.isFinite(Number(workerFilter))) {
        filters.worker_id = Number(workerFilter);
      }
      if (!jobScopedId && clientFilter && Number.isFinite(Number(clientFilter))) {
        filters.client_id = Number(clientFilter);
      }
      if (!jobScopedId && jobFilter && Number.isFinite(Number(jobFilter))) {
        filters.job_id = Number(jobFilter);
      }
      const timeOffFilters: Parameters<typeof fetchWorkerTimeOff>[0] = { from: rangeFrom, to: rangeTo };
      if (workerFilter && Number.isFinite(Number(workerFilter))) {
        timeOffFilters.worker_id = Number(workerFilter);
      }
      const [rows, scopedRows, offs] = await Promise.all([
        fetchSchedules(filters),
        jobScopedId
          ? fetchSchedules({ job_id: jobScopedId }).catch(() => [] as Schedule[])
          : Promise.resolve([] as Schedule[]),
        fetchWorkerTimeOff(timeOffFilters).catch(() => [] as WorkerTimeOff[]),
      ]);
      let nextRows = rows;
      if (projectFilter && Number.isFinite(Number(projectFilter))) {
        const projectId = Number(projectFilter);
        nextRows = rows.filter((row) => {
          if (row.project_id === projectId) return true;
          const job = catalog?.jobs.find((j) => j.id === row.job_id);
          return job?.projectId === projectId;
        });
      }
      setSchedules(nextRows);
      if (jobScopedId) {
        const seen = new Set<number>();
        const scoped: Schedule[] = [];
        for (const row of [...scopedRows, ...nextRows]) {
          if (seen.has(row.id) || !scheduleMatchesJob(row, jobScopedId, defaultJobSerial)) continue;
          seen.add(row.id);
          scoped.push(row);
        }
        setJobScopedSchedules(scoped);
      } else {
        setJobScopedSchedules([]);
      }
      setTimeOffs(offs);
    } catch (error) {
      toastApiError(error, t("loadError"));
      setSchedules([]);
      setJobScopedSchedules([]);
      setTimeOffs([]);
    } finally {
      setLoadingSchedules(false);
      setSchedulesReady(true);
    }
  }, [
    rangeFrom,
    rangeTo,
    workerFilter,
    clientFilter,
    jobFilter,
    projectFilter,
    catalog,
    jobScopedId,
    defaultJobSerial,
    t,
  ]);

  React.useEffect(() => {
    void reloadSchedules();
  }, [reloadSchedules, refreshKey]);

  function schedulingReturnHref() {
    if (!syncUrl) return buildCurrentPageBackHref(pathname, searchParams);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("schedule");
    if (!params.get("date")) params.set("date", toDateKey(anchorDate));
    const qs = params.toString();
    return qs ? `${routes.dashboard.scheduling}?${qs}` : routes.dashboard.scheduling;
  }

  React.useEffect(() => {
    if (!syncUrl || !scheduleIdParam) return;
    const id = Number(scheduleIdParam);
    if (!Number.isFinite(id) || id <= 0) return;
    const found = schedules.find((s) => s.id === id);
    if (found) {
      router.replace(buildPathWithStoredBack(`${routes.dashboard.jobs}/${found.job_id}`, schedulingReturnHref()));
      return;
    }
    let cancelled = false;
    (async () => {
      const row = await fetchSchedule(id);
      if (!cancelled && row) {
        router.replace(buildPathWithStoredBack(`${routes.dashboard.jobs}/${row.job_id}`, schedulingReturnHref()));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scheduleIdParam, schedules, router, syncUrl]);

  function patchSearchParams(patch: Record<string, string | null>) {
    if (!syncUrl) {
      if ("view" in patch) setLocalViewMode(parseViewMode(patch.view));
      if ("client" in patch) {
        setLocalClientFilter(patch.client ?? "");
        if (patch.client != null) {
          setLocalJobFilter("");
          setLocalProjectFilter("");
        }
      }
      if ("job" in patch) setLocalJobFilter(patch.job ?? "");
      if ("project" in patch) {
        setLocalProjectFilter(patch.project ?? "");
        if (patch.project != null) setLocalJobFilter("");
      }
      if ("worker" in patch && !fixedWorkerId) setLocalWorkerFilter(patch.worker ?? "");
      if ("group" in patch) setLocalGroupFilter(patch.group ?? "");
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${routes.dashboard.scheduling}?${qs}` : routes.dashboard.scheduling);
  }

  function setViewMode(mode: ViewMode) {
    patchSearchParams({ view: mode === "day" ? null : mode });
  }

  function setClientFilter(value: string) {
    patchSearchParams({ client: value || null, job: null, project: null });
  }

  function setJobFilter(value: string) {
    patchSearchParams({ job: value || null });
  }

  function setProjectFilter(value: string) {
    patchSearchParams({ project: value || null, job: null });
  }

  function setWorkerFilter(value: string) {
    patchSearchParams({ worker: value || null });
  }

  function setGroupFilter(value: string) {
    patchSearchParams({ group: value || null });
  }

  function clearFilters() {
    patchSearchParams({
      client: jobScopedId ? clientFilter || null : null,
      job: jobScopedId ? jobFilter || null : null,
      project: null,
      group: null,
    });
  }

  const hasActiveFilters = Boolean(
    (!jobScopedId && (clientFilter || jobFilter)) || projectFilter || groupFilter,
  );

  React.useEffect(() => {
    if (!filtersOpen) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      const el = e.target as Element;
      if (filterAnchorRef.current?.contains(target)) return;
      if (filterRowRef.current?.contains(target)) return;
      if (typeof el.closest === "function") {
        if (el.closest("[data-ot-checkmark-portal]")) return;
        if (el.closest("[role='menu']")) return;
      }
      setFiltersOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [filtersOpen]);

  function openWorkerCalendar(tech: SchedulingTechnician) {
    if (fixedWorkerId) return;
    setFiltersOpen(false);
    patchSearchParams({ worker: String(tech.id) });
  }

  const clientOptions = React.useMemo<CheckmarkSelectOption[]>(() => {
    const all: CheckmarkSelectOption[] = [{ value: "", label: t("allClients") }];
    if (!catalog) return all;
    return [...all, ...catalog.clients.map((c) => ({ value: String(c.id), label: c.name }))];
  }, [catalog, t]);

  const projectOptions = React.useMemo<CheckmarkSelectOption[]>(() => {
    const all: CheckmarkSelectOption[] = [{ value: "", label: t("allProjects") }];
    if (!catalog) return all;
    const clientId = clientFilter && Number.isFinite(Number(clientFilter)) ? Number(clientFilter) : null;
    let projects = catalog.projects;
    if (clientId != null) {
      projects = projects.filter((p) => p.clientId === clientId);
    }
    return [...all, ...projects.map((p) => ({ value: String(p.id), label: p.name }))];
  }, [catalog, clientFilter, t]);

  const jobOptions = React.useMemo<CheckmarkSelectOption[]>(() => {
    const all: CheckmarkSelectOption[] = [{ value: "", label: t("allJobs") }];
    if (!catalog) return all;
    const clientId = clientFilter && Number.isFinite(Number(clientFilter)) ? Number(clientFilter) : null;
    const projectId = projectFilter && Number.isFinite(Number(projectFilter)) ? Number(projectFilter) : null;
    let jobs = catalog.jobs;
    if (clientId != null) jobs = jobs.filter((j) => j.clientId === clientId);
    if (projectId != null) jobs = jobs.filter((j) => j.projectId === projectId);
    return [...all, ...jobs.map((j) => ({ value: String(j.id), label: j.label }))];
  }, [catalog, clientFilter, projectFilter, t]);

  const groupOptions = React.useMemo<CheckmarkSelectOption[]>(() => {
    const all: CheckmarkSelectOption[] = [{ value: "", label: t("allUserGroups") }];
    if (!catalog) return all;
    return [...all, ...(catalog.userGroups ?? []).map((g) => ({ value: String(g.id), label: g.name }))];
  }, [catalog, t]);

  // Job tab may have many schedules (one per worker). Always show this job's rows when scoped.
  const visibleSchedules = jobScopedId ? jobScopedSchedules : schedules;
  const allowCreate = true;

  const filteredTechs = React.useMemo(() => {
    if (!catalog) return [];
    let rows = catalog.technicians;
    if (workerFilter && Number.isFinite(Number(workerFilter))) {
      rows = rows.filter((r) => r.id === Number(workerFilter) || r.profileId === Number(workerFilter));
    }
    if (groupFilter && Number.isFinite(Number(groupFilter))) {
      const group = (catalog.userGroups ?? []).find((g) => g.id === Number(groupFilter));
      const memberIds = new Set((group?.users ?? []).map((u) => u.id));
      rows = rows.filter((r) => memberIds.has(r.id) || memberIds.has(r.profileId));
    }
    const q = techSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.searchText.includes(q));
  }, [catalog, workerFilter, groupFilter, techSearch]);

  const schedulesByWorkerDay = React.useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const schedule of visibleSchedules) {
      for (const day of days) {
        const key = toDateKey(day);
        if (!scheduleOverlapsDay(schedule, key)) continue;
        for (const workerId of scheduleWorkerIds(schedule)) {
          const mapKey = `${workerId}:${key}`;
          const list = map.get(mapKey) ?? [];
          list.push(schedule);
          map.set(mapKey, list);
        }
      }
    }
    return map;
  }, [visibleSchedules, days]);

  const schedulesByDay = React.useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const schedule of visibleSchedules) {
      for (const day of days) {
        const key = toDateKey(day);
        if (!scheduleOverlapsDay(schedule, key)) continue;
        const list = map.get(key) ?? [];
        list.push(schedule);
        map.set(key, list);
      }
    }
    for (const [key, list] of map) {
      list.sort((a, b) => a.start_at.localeCompare(b.start_at) || a.id - b.id);
      map.set(key, list);
    }
    return map;
  }, [visibleSchedules, days]);

  const timeOffsByWorkerDay = React.useMemo(() => {
    const map = new Map<string, WorkerTimeOff[]>();
    const techByWorker = new Map<number, SchedulingTechnician>();
    for (const tech of filteredTechs) {
      for (const id of technicianWorkerIds(tech)) techByWorker.set(id, tech);
    }
    for (const row of timeOffs) {
      for (const day of days) {
        const key = toDateKey(day);
        if (!scheduleOverlapsDay(row, key)) continue;
        const tech = techByWorker.get(row.worker_id);
        const workerKeys = tech ? technicianWorkerIds(tech) : [row.worker_id];
        for (const workerId of workerKeys) {
          const mapKey = `${workerId}:${key}`;
          const list = map.get(mapKey) ?? [];
          list.push(row);
          map.set(mapKey, list);
        }
      }
    }
    return map;
  }, [timeOffs, days, filteredTechs]);

  const timeOffsByDay = React.useMemo(() => {
    const map = new Map<string, WorkerTimeOff[]>();
    for (const row of timeOffs) {
      for (const day of days) {
        const key = toDateKey(day);
        if (!scheduleOverlapsDay(row, key)) continue;
        const list = map.get(key) ?? [];
        list.push(row);
        map.set(key, list);
      }
    }
    return map;
  }, [timeOffs, days]);

  const singleWorker = React.useMemo(() => {
    if (filteredTechs.length === 1) return filteredTechs[0] ?? null;
    return null;
  }, [filteredTechs]);

  React.useEffect(() => {
    if (!singleWorker) setDragMode("book");
  }, [singleWorker]);

  function toCreateTech(tech: SchedulingTechnician): CreateScheduleTechnician {
    return { id: tech.id, name: tech.name, title: tech.title, initials: tech.initials };
  }

  function openCreateSchedule(
    tech: SchedulingTechnician | null,
    day: Date,
    times?: { startTime: string; endTime: string },
  ) {
    // From job detail: job/client are known — create on drag without the modal.
    if (jobScopedId) {
      void createScheduleForScopedJob(tech, day, times);
      return;
    }

    setCreateTech(tech ? toCreateTech(tech) : null);
    setCreateDateKey(toDateKey(day));
    const jobPrefill: CreateSchedulePrefill = {
      dateKey: toDateKey(day),
      startTime: times?.startTime,
      endTime: times?.endTime,
      workerId: tech?.id,
    };
    if (!tech) {
      setCreatePrefill(jobPrefill);
      setCreateOpen(true);
      return;
    }
    const window = getDayAvailabilityWindow(tech.availableDays, day);
    if (!window) {
      toastError(t("conflict.noAvailability"));
      return;
    }
    if (times) {
      const startMin = timeToMinutes(times.startTime);
      const endMin = timeToMinutes(times.endTime);
      if (
        startMin == null ||
        endMin == null ||
        startMin < window.startMinutes ||
        endMin > window.endMinutes
      ) {
        toastError(t("conflict.unavailable"));
        return;
      }
    }
    const startTime = times?.startTime ?? minutesToTime(window.startMinutes);
    const endTime =
      times?.endTime ?? minutesToTime(Math.min(window.startMinutes + 60, window.endMinutes));
    setCreatePrefill({ ...jobPrefill, startTime, endTime });
    setCreateOpen(true);
  }

  async function createScheduleForScopedJob(
    tech: SchedulingTechnician | null,
    day: Date,
    times?: { startTime: string; endTime: string },
  ) {
    if (!jobScopedId || creatingSchedule) return;

    if (!jobScopedClientId) {
      toastError(t("validation.client"));
      return;
    }

    const workerId =
      tech?.id ??
      (typeof defaultAssignedWorkerId === "number" && defaultAssignedWorkerId > 0
        ? defaultAssignedWorkerId
        : null);
    if (workerId == null) {
      toastError(t("validation.worker"));
      return;
    }

    const catalogTech =
      tech ??
      catalog?.technicians.find(
        (row) => row.id === workerId || row.profileId === workerId,
      ) ??
      null;

    let startTime = times?.startTime;
    let endTime = times?.endTime;

    if (catalogTech) {
      const window = getDayAvailabilityWindow(catalogTech.availableDays, day);
      if (!window) {
        toastError(t("conflict.noAvailability"));
        return;
      }
      if (times) {
        const startMin = timeToMinutes(times.startTime);
        const endMin = timeToMinutes(times.endTime);
        if (
          startMin == null ||
          endMin == null ||
          startMin < window.startMinutes ||
          endMin > window.endMinutes
        ) {
          toastError(t("conflict.unavailable"));
          return;
        }
      }
      startTime = times?.startTime ?? minutesToTime(window.startMinutes);
      endTime =
        times?.endTime ?? minutesToTime(Math.min(window.startMinutes + 60, window.endMinutes));
    }

    if (!startTime?.trim() || !endTime?.trim()) {
      toastError(t("validation.startTime"));
      return;
    }

    const dateKey = toDateKey(day);
    const startIso = combineDateAndTimeToIso(dateKey, startTime, false);
    const endIso = combineDateAndTimeEndToIso(dateKey, endTime, false);

    const conflict = getBookingConflict({
      workerId,
      startAt: startIso,
      endAt: endIso,
    });
    if (conflict) {
      toastError(conflict);
      return;
    }

    setCreatingSchedule(true);
    try {
      const created = await createSchedule({
        job_id: jobScopedId,
        worker_id: workerId,
        worker_ids: [workerId],
        client_id: jobScopedClientId,
        project_id: jobScopedProjectId,
        start_at: startIso,
        end_at: endIso,
        notes: null,
        recurrence: "none",
        recurrence_end_at: null,
        all_day: false,
      });
      toastSuccess(t("modal.successToast"));
      onScheduleCreated(created);
    } catch (error) {
      toastApiError(error, t("modal.errorToast"));
    } finally {
      setCreatingSchedule(false);
    }
  }

  function getBookingConflict(input: {
    workerId: number;
    startAt: string;
    endAt: string;
    ignoreScheduleId?: number;
  }): string | null {
    const tech = catalog?.technicians.find(
      (row) => row.id === input.workerId || row.profileId === input.workerId,
    );
    const start = new Date(input.startAt);
    const end = new Date(input.endAt);
    if (!(start < end)) return t("conflict.invalidRange");

    if (tech) {
      if (!hasAvailabilityData(tech.availableDays)) return t("conflict.noAvailability");
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cursor <= last) {
        const window = getDayAvailabilityWindow(tech.availableDays, cursor);
        if (!window) return t("conflict.unavailable");
        const dayStart = new Date(cursor);
        const dayEnd = addDays(dayStart, 1);
        const clipStart = start > dayStart ? start : dayStart;
        const clipEnd = end < dayEnd ? end : dayEnd;
        const startMin = (clipStart.getTime() - dayStart.getTime()) / 60_000;
        const endMin = (clipEnd.getTime() - dayStart.getTime()) / 60_000;
        if (startMin < window.startMinutes || endMin > window.endMinutes) return t("conflict.unavailable");
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const booked = schedules.some(
      (row) =>
        (tech
          ? scheduleWorkerIds(row).some((id) => technicianMatchesWorkerId(tech, id))
          : scheduleWorkerIds(row).includes(input.workerId)) &&
        row.id !== input.ignoreScheduleId &&
        isoOverlaps(input.startAt, input.endAt, row.start_at, row.end_at),
    );
    if (booked) return t("conflict.booked");

    const off = timeOffs.some(
      (row) =>
        (tech ? technicianMatchesWorkerId(tech, row.worker_id) : row.worker_id === input.workerId) &&
        isoOverlaps(input.startAt, input.endAt, row.start_at, row.end_at),
    );
    if (off) return t("conflict.timeOff");
    return null;
  }

  function openTimeOffForDay(tech: SchedulingTechnician, day: Date, times?: { startTime: string; endTime: string }) {
    const window = getDayAvailabilityWindow(tech.availableDays, day);
    if (!window) {
      toastError(t("conflict.noAvailability"));
      return;
    }
    if (times) {
      const startMin = timeToMinutes(times.startTime);
      const endMin = timeToMinutes(times.endTime);
      if (
        startMin == null ||
        endMin == null ||
        startMin < window.startMinutes ||
        endMin > window.endMinutes
      ) {
        toastError(t("conflict.unavailable"));
        return;
      }
      const startAt = combineDateAndTimeToIso(toDateKey(day), times.startTime, false);
      const endAt = combineDateAndTimeEndToIso(toDateKey(day), times.endTime, false);
      const conflict = getBookingConflict({ workerId: tech.id, startAt, endAt });
      if (conflict) {
        toastError(conflict);
        return;
      }
    }
    setCreateTech(toCreateTech(tech));
    setTimeOffPrefill({
      dateKey: toDateKey(day),
      startTime: times?.startTime ?? minutesToTime(window.startMinutes),
      endTime: times?.endTime ?? minutesToTime(window.endMinutes),
    });
    setTimeOffOpen(true);
  }

  function onTimelineRangeSelect(range: TimelineRangeSelect) {
    if (dragMode === "timeoff") {
      openTimeOffForDay(range.tech, range.day, {
        startTime: range.startTime,
        endTime: range.endTime,
      });
      return;
    }
    openCreateSchedule(range.tech, range.day, {
      startTime: range.startTime,
      endTime: range.endTime,
    });
  }

  function openJobDetail(schedule: Schedule) {
    const detailPath = `${routes.dashboard.jobs}/${schedule.job_id}`;
    if (pathWithoutQueryAndHash(pathname) === pathWithoutQueryAndHash(detailPath)) return;
    router.push(buildPathWithStoredBack(detailPath, schedulingReturnHref()));
  }

  function onScheduleCreated(schedule?: Pick<Schedule, "start_at" | "worker_id" | "worker_ids"> | number) {
    if (schedule && typeof schedule === "object") {
      const start = new Date(schedule.start_at);
      if (!Number.isNaN(start.getTime())) {
        setAnchorDate(startOfLocalDaySafe(start));
        setTimelineFocusMinutes(start.getHours() * 60 + start.getMinutes());
        const workerId =
          scheduleWorkerIds(schedule as Schedule)[0] ??
          (typeof schedule.worker_id === "number" ? schedule.worker_id : null);
        setTimelineFocusWorkerId(workerId);
      }
    }
    setRefreshKey((k) => k + 1);
  }

  const clearTimelineFocus = React.useCallback(() => {
    setTimelineFocusMinutes(null);
    setTimelineFocusWorkerId(null);
  }, []);

  function copySchedule(schedule: Schedule) {
    setCopiedSchedule(schedule);
    toastSuccess(t("copy.copiedToast"));
  }

  async function pasteScheduleToWorker(tech: SchedulingTechnician) {
    if (!copiedSchedule || pastingSchedule) return;
    if (scheduleWorkerIds(copiedSchedule).some((id) => technicianMatchesWorkerId(tech, id))) {
      toastError(t("copy.sameWorker"));
      return;
    }

    const conflict = getBookingConflict({
      workerId: tech.id,
      startAt: copiedSchedule.start_at,
      endAt: copiedSchedule.end_at,
    });
    if (conflict) {
      toastError(conflict);
      return;
    }

    setPastingSchedule(true);
    try {
      const created = await createSchedule({
        job_id: copiedSchedule.job_id,
        worker_id: tech.id,
        worker_ids: [tech.id],
        client_id: copiedSchedule.client_id,
        project_id: copiedSchedule.project_id,
        start_at: copiedSchedule.start_at,
        end_at: copiedSchedule.end_at,
        notes: copiedSchedule.notes,
        recurrence: copiedSchedule.recurrence ?? "none",
        recurrence_end_at: copiedSchedule.recurrence_end_at,
        all_day: copiedSchedule.all_day,
      });
      toastSuccess(t("copy.pastedToast"));
      setCopiedSchedule(null);
      onScheduleCreated(created);
    } catch (error) {
      toastApiError(error, t("copy.pasteError"));
    } finally {
      setPastingSchedule(false);
    }
  }

  async function confirmRemoveSchedule() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSchedule(deleteTarget.id);
      toastSuccess(t("detail.deletedToast"));
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toastApiError(error, t("detail.deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  async function confirmRemoveTimeOff() {
    if (!deleteTimeOff) return;
    setDeletingTimeOff(true);
    try {
      await deleteWorkerTimeOff(deleteTimeOff.id);
      toastSuccess(t("timeOff.deletedToast"));
      setDeleteTimeOff(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toastApiError(error, t("timeOff.deleteError"));
    } finally {
      setDeletingTimeOff(false);
    }
  }

  function goPrev() {
    setAnchorDate((d) => {
      if (viewMode === "month") return addMonths(d, -1);
      if (viewMode === "week") return addDays(d, -7);
      return addDays(d, -1);
    });
  }
  function goNext() {
    setAnchorDate((d) => {
      if (viewMode === "month") return addMonths(d, 1);
      if (viewMode === "week") return addDays(d, 7);
      return addDays(d, 1);
    });
  }
  function goToday() {
    setAnchorDate(new Date());
    setViewMode("day");
  }

  function openDayView(day: Date) {
    setAnchorDate(day);
    setViewMode("day");
  }

  const loading = catalogLoading || loadingSchedules;
  const showScheduleSkeleton = !schedulesReady && loading;
  const colTemplate = `minmax(220px, 240px) repeat(${days.length}, minmax(140px, 1fr))`;

  function clearPeopleFilters() {
    setTechSearch("");
    setGroupFilter("");
    if (!fixedWorkerId) setWorkerFilter("");
  }

  const hasPeopleFilters = Boolean(
    techSearch.trim() || groupFilter || (!fixedWorkerId && workerFilter),
  );

  const focusedWorker =
    singleWorker && (fixedWorkerId || Boolean(workerFilter)) ? singleWorker : null;

  const peopleHeader = (
    <SchedulingPeopleHeader
      search={techSearch}
      focusedWorker={focusedWorker}
      prominent={false}
      onBack={!fixedWorkerId && focusedWorker ? () => setWorkerFilter("") : undefined}
      onSearchChange={setTechSearch}
    />
  );

  const filterFields = (
    <>
      {jobScopedId ? null : (
        <>
          <CheckmarkSelect
            listLabel={t("allClients")}
            buttonAriaLabel={t("allClients")}
            options={clientOptions}
            value={clientFilter}
            searchable
            portaled
            clearable
            className="min-w-[9.5rem] shrink-0"
            size="sm"
            onChange={setClientFilter}
          />
          <CheckmarkSelect
            listLabel={t("allProjects")}
            buttonAriaLabel={t("allProjects")}
            options={projectOptions}
            value={projectFilter}
            searchable
            portaled
            clearable
            className="min-w-[9.5rem] shrink-0"
            size="sm"
            onChange={setProjectFilter}
          />
          <CheckmarkSelect
            listLabel={t("allJobs")}
            buttonAriaLabel={t("allJobs")}
            options={jobOptions}
            value={jobFilter}
            searchable
            portaled
            clearable
            className="min-w-[9.5rem] shrink-0"
            size="sm"
            onChange={setJobFilter}
          />
        </>
      )}
      <CheckmarkSelect
        listLabel={t("allUserGroups")}
        buttonAriaLabel={t("allUserGroups")}
        options={groupOptions}
        value={groupFilter}
        searchable
        portaled
        clearable
        className="min-w-[9.5rem] shrink-0"
        size="sm"
        onChange={setGroupFilter}
      />
      {hasActiveFilters ? (
        <AppButton type="button" variant="secondary" size="sm" className="shrink-0" onClick={clearFilters}>
          {tList("clearFilters")}
        </AppButton>
      ) : null}
    </>
  );

  const toolbarRow = (
    <div
      className={cn(
        "flex min-h-[2.75rem] items-center gap-2 py-2",
        syncUrl ? dashboardContentHorizontalGutterClassName : "border-b border-slate-200 px-3 dark:border-slate-800",
      )}
    >
      <button
        ref={filterAnchorRef}
        type="button"
        onClick={() => setFiltersOpen((open) => !open)}
        aria-expanded={filtersOpen}
        aria-label={tList("filterMenuAria")}
        title={tList("filterMenuAria")}
        className={cn(
          "relative inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition outline-none",
          "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
          "focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-offset-slate-950",
          filtersOpen && "border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800",
        )}
      >
        <Funnel className="size-4" strokeWidth={2} aria-hidden />
        {hasActiveFilters ? (
          <span
            className="absolute right-1 top-1 size-1.5 rounded-full ring-2 ring-white dark:ring-slate-900"
            style={{ background: "var(--dash-accent, #111)" }}
            aria-hidden
          />
        ) : null}
      </button>

      {filtersOpen ? (
        <div
          ref={filterRowRef}
          role="region"
          aria-label={tList("filterMenu")}
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain"
        >
          {filterFields}
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Previous"
                onClick={goPrev}
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center border-l border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Next"
                onClick={goNext}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{rangeLabel}</p>
          </div>

          <SchedulingLegend className="mx-2 hidden min-w-0 flex-1 justify-center lg:flex" />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={goToday}
            >
              {t("today")}
            </button>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
              {(
                [
                  ["day", t("viewDay")],
                  ["week", t("viewWeek")],
                  ["month", t("viewMonth")],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                    viewMode === mode
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
                  )}
                  onClick={() => setViewMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  React.useEffect(() => {
    if (!syncUrl) return;
    setSecondaryRow(toolbarRow);
    return () => setSecondaryRow(null);
  });

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {syncUrl ? null : toolbarRow}

      {focusedWorker || (singleWorker && viewMode !== "month") ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-1 py-1 dark:border-slate-800 sm:px-2">
          {focusedWorker ? <div className="min-w-0 flex-1">{peopleHeader}</div> : null}
          <SchedulingLegend className={cn("min-w-0 lg:hidden", focusedWorker ? "hidden sm:flex" : "flex-1")} />
          {singleWorker && viewMode !== "month" ? (
            <div className="ml-auto inline-flex shrink-0 rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
              {(
                [
                  ["book", t("bookJob")],
                  ["timeoff", t("markTimeOff")],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-semibold transition",
                    dragMode === mode
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
                  )}
                  onClick={() => setDragMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex shrink-0 items-center border-b border-slate-200 px-1 py-1 dark:border-slate-800 sm:px-2 lg:hidden">
          <SchedulingLegend />
        </div>
      )}

      {viewMode === "day" && days[0] ? (
        <div className="flex shrink-0 items-stretch gap-1 border-b border-slate-200 px-1 py-1.5 dark:border-slate-800 sm:px-2">
          {buildWeekDays(startOfWeekMonday(anchorDate)).map((day) => {
            const key = toDateKey(day);
            const selected = isSameLocalDay(day, anchorDate);
            const isToday = isSameLocalDay(day, new Date());
            const tone = singleWorker
              ? dayTone(
                  getDayAvailabilityWindow(singleWorker.availableDays, day),
                  hasAvailabilityData(singleWorker.availableDays),
                  occupiedRangesForDay(timeOffsByDay.get(key) ?? [], key),
                )
              : mergeTones(
                  filteredTechs.map((tech) =>
                    dayTone(
                      getDayAvailabilityWindow(tech.availableDays, day),
                      hasAvailabilityData(tech.availableDays),
                      occupiedRangesForDay(
                        rowsForTechnician(timeOffsByDay.get(key) ?? [], tech),
                        key,
                      ),
                    ),
                  ),
                );
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  "flex w-12 shrink-0 flex-col items-center rounded-md border px-1 py-1 text-center transition sm:w-[3.25rem]",
                  selected
                    ? "border-sky-600 bg-sky-600 text-white"
                    : cn(
                        "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-200",
                        availabilityToneClass(tone) || "bg-white dark:bg-slate-900",
                      ),
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
        showScheduleSkeleton ? (
          <div className="space-y-2 p-4">
            <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {focusedWorker ? (
              <SchedulingWeekCalendar
                days={[days[0]]}
                technician={focusedWorker}
                schedules={visibleSchedules}
                timeOffs={timeOffs}
                dragMode={dragMode}
                allowCreate={allowCreate}
                hideDayHeaders
                fillHeight
                onCreate={(day, startTime, endTime) => {
                  if (dragMode === "timeoff") {
                    openTimeOffForDay(focusedWorker, day, { startTime, endTime });
                    return;
                  }
                  if (!allowCreate) return;
                  openCreateSchedule(focusedWorker, day, { startTime, endTime });
                }}
                onScheduleClick={openJobDetail}
                onRemoveSchedule={setDeleteTarget}
                onRemoveTimeOff={setDeleteTimeOff}
              />
            ) : (
              <SchedulingDayTimeline
                day={days[0]}
                technicians={filteredTechs}
                schedules={visibleSchedules}
                timeOffs={timeOffs}
                peopleHeader={peopleHeader}
                dragMode={dragMode}
                allowCreate={allowCreate}
                copiedSchedule={copiedSchedule}
                pasteDisabled={pastingSchedule}
                scrollToMinutes={timelineFocusMinutes}
                scrollToWorkerId={timelineFocusWorkerId}
                onScrollTargetApplied={clearTimelineFocus}
                onClearPeopleFilters={hasPeopleFilters ? clearPeopleFilters : undefined}
                onCreateSchedule={openCreateSchedule}
                onRangeSelect={allowCreate ? onTimelineRangeSelect : undefined}
                onScheduleClick={openJobDetail}
                onRemoveSchedule={setDeleteTarget}
                onCopySchedule={copySchedule}
                onPasteSchedule={(tech) => void pasteScheduleToWorker(tech)}
                onRemoveTimeOff={setDeleteTimeOff}
                onWorkerClick={openWorkerCalendar}
              />
            )}
          </div>
        )
      ) : viewMode === "month" ? (
        showScheduleSkeleton ? (
          <div className="space-y-2 p-4">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-64 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : filteredTechs.length === 0 ? (
          <SchedulingEmptyUsers onClear={hasPeopleFilters ? clearPeopleFilters : undefined} />
        ) : (
          <SchedulingMonthCalendar
            anchorMonth={anchorDate}
            monthDays={days}
            schedulesByDay={schedulesByDay}
            timeOffsByDay={timeOffsByDay}
            technicians={filteredTechs}
            loading={false}
            singleWorker={singleWorker}
            onDayClick={(day) => setAnchorDate(day)}
            onCreateSchedule={allowCreate ? openCreateSchedule : undefined}
          />
        )
      ) : loading ? (
        <div className="space-y-2 p-4">
          <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : filteredTechs.length === 0 ? (
        <SchedulingEmptyUsers onClear={hasPeopleFilters ? clearPeopleFilters : undefined} />
      ) : focusedWorker ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SchedulingWeekCalendar
            days={days}
            technician={focusedWorker}
            schedules={visibleSchedules}
            timeOffs={timeOffs}
            dragMode={dragMode}
            allowCreate={allowCreate}
            onDayHeaderClick={setAgendaDay}
            onCreate={(day, startTime, endTime) => {
              if (dragMode === "timeoff") {
                openTimeOffForDay(focusedWorker, day, { startTime, endTime });
                return;
              }
              if (!allowCreate) return;
              openCreateSchedule(focusedWorker, day, { startTime, endTime });
            }}
            onScheduleClick={openJobDetail}
            onRemoveSchedule={setDeleteTarget}
            onRemoveTimeOff={setDeleteTimeOff}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[760px]">
            <div
              className="sticky top-0 z-20 grid border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              style={{ gridTemplateColumns: colTemplate }}
            >
              <div className="border-r border-slate-200 px-2 py-2 dark:border-slate-800">
                {peopleHeader}
              </div>
              {days.map((day) => {
                const isToday = isSameLocalDay(day, new Date());
                const dayKey = toDateKey(day);
                const tone = mergeTones(
                  filteredTechs.map((tech) =>
                    dayTone(
                      getDayAvailabilityWindow(tech.availableDays, day),
                      hasAvailabilityData(tech.availableDays),
                      occupiedRangesForDay(
                        rowsForTechnician(timeOffsByDay.get(dayKey) ?? [], tech),
                        dayKey,
                      ),
                    ),
                  ),
                );
                return (
                  <button
                    type="button"
                    key={dayKey}
                    className="relative flex h-[4.25rem] min-w-0 flex-col items-center justify-center border-r border-slate-200 px-1 text-center last:border-r-0 dark:border-slate-800"
                    onClick={() => setAgendaDay(day)}
                  >
                    <span className={cn("absolute inset-x-0 top-0 h-1", availabilityHeaderBarClass(tone))} />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {formatWeekdayShort(day, locale)}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-semibold",
                        isToday
                          ? "bg-sky-600 text-white"
                          : "text-slate-800 dark:text-slate-100",
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredTechs.map((tech) => (
              <div
                key={tech.id}
                className="grid border-b border-slate-100 dark:border-slate-800/80"
                style={{ gridTemplateColumns: colTemplate }}
              >
                <div className="flex min-w-0 items-center gap-2.5 border-r border-slate-200 px-3 py-2.5 dark:border-slate-800">
                  <div
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold uppercase text-white dark:bg-slate-200 dark:text-slate-900"
                    aria-hidden
                  >
                    {tech.initials}
                  </div>
                  <div className="min-w-0">
                    {fixedWorkerId ? (
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {tech.name}
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="block w-full truncate text-left text-sm font-semibold text-sky-700 hover:underline dark:text-sky-400"
                        onClick={() => openWorkerCalendar(tech)}
                      >
                        {tech.name}
                      </button>
                    )}
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{tech.title}</p>
                  </div>
                </div>

                {days.map((day) => {
                  const dayKey = toDateKey(day);
                  const cellSchedules = workerDayRows(schedulesByWorkerDay, tech, dayKey);
                  const cellTimeOffs = workerDayRows(timeOffsByWorkerDay, tech, dayKey);
                  return (
                    <div
                      key={`${tech.id}-${dayKey}`}
                      className="min-h-[4.5rem] border-r border-slate-100 p-1 last:border-r-0 dark:border-slate-800/60"
                    >
                      <SchedulingWeekDayStrip
                        tech={tech}
                        day={day}
                        schedules={cellSchedules}
                        timeOffs={cellTimeOffs}
                        onCreate={
                          dragMode === "timeoff"
                            ? (startTime, endTime) => openTimeOffForDay(tech, day, { startTime, endTime })
                            : allowCreate
                              ? (startTime, endTime) => openCreateSchedule(tech, day, { startTime, endTime })
                              : undefined
                        }
                        onScheduleClick={openJobDetail}
                        onRemoveSchedule={setDeleteTarget}
                        onRemoveTimeOff={setDeleteTimeOff}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateScheduleModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        technician={createTech}
        defaultDateKey={createDateKey}
        prefill={createPrefill}
        getBookingConflict={getBookingConflict}
        onCreated={onScheduleCreated}
      />

      <SchedulingDayAgendaPanel
        open={agendaDay != null}
        day={agendaDay}
        schedules={agendaDay ? schedulesByDay.get(toDateKey(agendaDay)) ?? [] : []}
        timeOffs={agendaDay ? timeOffsByDay.get(toDateKey(agendaDay)) ?? [] : []}
        technicians={filteredTechs}
        userGroups={catalog?.userGroups ?? []}
        groupOptions={groupOptions}
        canCreate={
          allowCreate &&
          agendaDay != null &&
          (singleWorker
            ? hasFreeBookableSlot(
                getDayAvailabilityWindow(singleWorker.availableDays, agendaDay),
                hasAvailabilityData(singleWorker.availableDays),
                [
                  ...occupiedRangesForDay(schedulesByDay.get(toDateKey(agendaDay)) ?? [], toDateKey(agendaDay)),
                  ...occupiedRangesForDay(timeOffsByDay.get(toDateKey(agendaDay)) ?? [], toDateKey(agendaDay)),
                ],
              )
            : filteredTechs.some((tech) =>
                hasFreeBookableSlot(
                  getDayAvailabilityWindow(tech.availableDays, agendaDay),
                  hasAvailabilityData(tech.availableDays),
                  [
                    ...occupiedRangesForDay(
                      rowsForTechnician(schedulesByDay.get(toDateKey(agendaDay)) ?? [], tech),
                      toDateKey(agendaDay),
                    ),
                    ...occupiedRangesForDay(
                      rowsForTechnician(timeOffsByDay.get(toDateKey(agendaDay)) ?? [], tech),
                      toDateKey(agendaDay),
                    ),
                  ],
                ),
              ))
        }
        onClose={() => setAgendaDay(null)}
        onOpenDayView={() => {
          if (!agendaDay) return;
          openDayView(agendaDay);
          setAgendaDay(null);
        }}
        onCreate={() => {
          if (!agendaDay) return;
          openCreateSchedule(singleWorker, agendaDay);
          setAgendaDay(null);
        }}
        onScheduleClick={(schedule) => {
          setAgendaDay(null);
          openJobDetail(schedule);
        }}
        onRemoveSchedule={setDeleteTarget}
        onCopySchedule={copySchedule}
        onRemoveTimeOff={setDeleteTimeOff}
      />

      <MarkUnavailableModal
        open={timeOffOpen}
        technician={createTech}
        prefill={timeOffPrefill}
        getBookingConflict={getBookingConflict}
        onClose={() => setTimeOffOpen(false)}
        onSaved={onScheduleCreated}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title={t("detail.deleteConfirmTitle")}
        body={t("detail.deleteConfirmBody")}
        highlight={deleteTarget ? <ScheduleDeleteSummary schedule={deleteTarget} /> : undefined}
        confirmLabel={t("detail.delete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
        onClose={() => (!deleting ? setDeleteTarget(null) : undefined)}
        onConfirm={() => void confirmRemoveSchedule()}
      />

      <ConfirmDialog
        open={deleteTimeOff != null}
        title={t("timeOff.deleteConfirmTitle")}
        body={t("timeOff.deleteConfirmBody")}
        highlight={
          deleteTimeOff
            ? `${deleteTimeOff.worker_name} · ${deleteTimeOff.reason.trim() || t("timeOff.blocked")}`
            : undefined
        }
        confirmLabel={t("timeOff.remove")}
        cancelLabel={t("modal.cancel")}
        isBusy={deletingTimeOff}
        onClose={() => (!deletingTimeOff ? setDeleteTimeOff(null) : undefined)}
        onConfirm={() => void confirmRemoveTimeOff()}
      />
    </div>
  );
}
