"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ScheduleCreateCellButton } from "@/features/scheduling/components/schedule-create-cell-button";
import { ScheduleEventChip } from "@/features/scheduling/components/schedule-event-chip";
import { TimeOffChip } from "@/features/scheduling/components/time-off-chip";
import type { Schedule, WorkerTimeOff } from "@/features/scheduling/types/schedule.types";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import type { UserGroup } from "@/features/user-groups/types/user-group.types";
import { formatDayHeader } from "@/features/scheduling/utils/scheduling-week.util";
import { AppButton, AppTabs, CheckmarkSelect, DetailPanel, surfaceInputClassName } from "@/shared/ui";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import { cn } from "@/core/utils/http.util";

type AgendaTab = "jobs" | "timeoff";

type Props = {
  open: boolean;
  day: Date | null;
  schedules: Schedule[];
  timeOffs: WorkerTimeOff[];
  technicians?: SchedulingTechnician[];
  userGroups?: UserGroup[];
  groupOptions?: CheckmarkSelectOption[];
  canCreate?: boolean;
  onClose: () => void;
  onOpenDayView?: () => void;
  onCreate?: () => void;
  onScheduleClick: (schedule: Schedule) => void;
  onRemoveSchedule?: (schedule: Schedule) => void;
  onRemoveTimeOff?: (timeOff: WorkerTimeOff) => void;
};

function workerInGroup(
  workerId: number,
  groupId: string,
  userGroups: UserGroup[],
  technicians: SchedulingTechnician[],
): boolean {
  if (!groupId) return true;
  const group = userGroups.find((row) => String(row.id) === groupId);
  if (!group) return true;
  const memberIds = new Set((group.users ?? []).map((user) => user.id));
  if (memberIds.has(workerId)) return true;
  const tech = technicians.find((row) => row.id === workerId);
  return tech ? memberIds.has(tech.profileId) : false;
}

export function SchedulingDayAgendaPanel({
  open,
  day,
  schedules,
  timeOffs,
  technicians = [],
  userGroups = [],
  groupOptions = [],
  canCreate = true,
  onClose,
  onOpenDayView,
  onCreate,
  onScheduleClick,
  onRemoveSchedule,
  onRemoveTimeOff,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();
  const [tab, setTab] = React.useState<AgendaTab>("jobs");
  const [groupId, setGroupId] = React.useState("");
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setTab(schedules.length === 0 && timeOffs.length > 0 ? "timeoff" : "jobs");
    setGroupId("");
    setSearch("");
  }, [open, day, schedules.length, timeOffs.length]);

  const title = day ? formatDayHeader(day, locale, t("today")) : t("agenda.title");
  const query = search.trim().toLowerCase();

  const filteredSchedules = schedules
    .filter((row) => workerInGroup(row.worker_id, groupId, userGroups, technicians))
    .filter((row) => {
      if (!query) return true;
      return `${row.job_title} ${row.client_name} ${row.worker_name}`.toLowerCase().includes(query);
    })
    .sort((a, b) => a.start_at.localeCompare(b.start_at));

  const filteredTimeOffs = timeOffs
    .filter((row) => workerInGroup(row.worker_id, groupId, userGroups, technicians))
    .filter((row) => {
      if (!query) return true;
      return `${row.worker_name} ${row.reason}`.toLowerCase().includes(query);
    })
    .sort((a, b) => a.start_at.localeCompare(b.start_at));

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title={title}
      subtitle={t("agenda.subtitle", { jobs: filteredSchedules.length, timeOff: filteredTimeOffs.length })}
      widthClassName="sm:max-w-md"
      action={
        onOpenDayView ? (
          <AppButton type="button" variant="secondary" size="sm" onClick={onOpenDayView}>
            {t("agenda.openDay")}
          </AppButton>
        ) : null
      }
      footer={
        canCreate && onCreate ? (
          <div className="flex justify-end">
            <ScheduleCreateCellButton onClick={onCreate} />
          </div>
        ) : null
      }
    >
      <div className="space-y-3">
        {groupOptions.length > 0 ? (
          <div className="flex items-center gap-2">
            <CheckmarkSelect
              listLabel={t("allUserGroups")}
              buttonAriaLabel={t("allUserGroups")}
              options={groupOptions}
              value={groupId}
              searchable
              portaled
              size="sm"
              className="min-w-0 flex-1"
              onChange={setGroupId}
            />
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                placeholder={t("agenda.searchPlaceholder")}
                aria-label={t("agenda.searchPlaceholder")}
                className={cn(surfaceInputClassName, "h-8 pl-7 pr-2 text-xs")}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <AppTabs
          ariaLabel={t("agenda.tabsAria")}
          tabs={[
            { id: "jobs", label: `${t("agenda.jobsTab")} (${filteredSchedules.length})` },
            { id: "timeoff", label: `${t("agenda.timeOffTab")} (${filteredTimeOffs.length})` },
          ]}
          value={tab}
          onValueChange={(id) => setTab(id === "timeoff" ? "timeoff" : "jobs")}
        />

        {tab === "jobs" ? (
          filteredSchedules.length === 0 ? (
            <p className="pt-2 text-sm text-slate-500">{t("agenda.emptyJobs")}</p>
          ) : (
            <div className="space-y-2 pt-1">
              {filteredSchedules.map((schedule) => (
                <ScheduleEventChip
                  key={schedule.id}
                  schedule={schedule}
                  detailed
                  onOpen={() => onScheduleClick(schedule)}
                  onRemove={onRemoveSchedule ? () => onRemoveSchedule(schedule) : undefined}
                />
              ))}
            </div>
          )
        ) : filteredTimeOffs.length === 0 ? (
          <p className="pt-2 text-sm text-slate-500">{t("agenda.emptyTimeOff")}</p>
        ) : (
          <div className="space-y-2 pt-1">
            {filteredTimeOffs.map((row) => (
              <TimeOffChip
                key={row.id}
                timeOff={row}
                detailed
                onRemove={onRemoveTimeOff ? () => onRemoveTimeOff(row) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}
