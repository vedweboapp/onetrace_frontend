"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CheckSquare, Square } from "lucide-react";
import { updateOrganizationDetails } from "../api/company-settings.api";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { useTranslations } from "next-intl";
import { OrganizationDetails } from "../types/types";
import {
  buildDirtyOrganizationPatch,
  hasDirtyFields,
  SCHEDULE_TAB_FIELDS,
} from "../utils/company-settings-diff.util";
import {
  AppButton,
  FieldGroup,
  surfaceInputClassName,
  surfaceSelectClassName,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const BREAK_OPTIONS = ["15 minutes", "30 minutes", "45 minutes", "1 hour"];

interface CompanySettingScheduleProps {
  initialData: OrganizationDetails;
  onSaveSuccess?: (data: OrganizationDetails) => void;
}

const CompanySettingSchedule = ({
  initialData,
  onSaveSuccess,
}: CompanySettingScheduleProps) => {
  const t = useTranslations("Dashboard.settingsCompany");
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [workingDays, setWorkingDays] = useState<string[]>(
    initialData.workingDays && initialData.workingDays.length > 0
      ? initialData.workingDays.map(
          (d) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase(),
        )
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  );
  const [startTime, setStartTime] = useState(initialData.startTime || "09:00");
  const [endTime, setEndTime] = useState(initialData.endTime || "17:00");
  const [breakDuration, setBreakDuration] = useState(
    initialData.breakDuration || "30 minutes",
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDirty = useMemo(() => {
    const current: OrganizationDetails = {
      ...initialData,
      workingDays,
      startTime,
      endTime,
      breakDuration,
    };
    const patch = buildDirtyOrganizationPatch(
      initialData,
      current,
      SCHEDULE_TAB_FIELDS,
    );
    return hasDirtyFields(patch);
  }, [initialData, workingDays, startTime, endTime, breakDuration]);

  const toggleDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const current: OrganizationDetails = {
        ...initialData,
        workingDays,
        startTime,
        endTime,
        breakDuration,
      };
      const patch = buildDirtyOrganizationPatch(
        initialData,
        current,
        SCHEDULE_TAB_FIELDS,
      );

      if (!hasDirtyFields(patch)) {
        toastSuccess(t("noChangesToast"));
        return;
      }

      const updated = await updateOrganizationDetails(1, patch);
      toastSuccess(t("scheduleUpdatedToast"));
      onSaveSuccess?.(updated);
    } catch (error) {
      console.error("Failed to save schedule:", error);
      toastApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const timezoneDisplay = initialData.timezone || "GMT+0";
  const breakSelectValue = BREAK_OPTIONS.includes(breakDuration)
    ? breakDuration
    : BREAK_OPTIONS[1];

  return (
    <div
      className={cn(
        "mt-2 flex flex-col rounded-xl border border-slate-200/90 bg-white dark:border-slate-700 dark:bg-slate-950",
        "transition-opacity duration-500",
        isMounted ? "animate-in fade-in opacity-100" : "opacity-0",
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Working Schedule
        </h2>
        <span className="text-[length:var(--dash-label-size,0.875rem)] font-medium text-slate-500 dark:text-slate-400">
          Current Timezone: {timezoneDisplay}
        </span>
      </div>

      <div className="flex flex-col gap-8 p-6 sm:p-8">
        <FieldGroup label="Operational Days" htmlFor="schedule-days" required>
          <div id="schedule-days" className="flex flex-wrap items-center gap-2.5">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = workingDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition",
                    isSelected
                      ? "border-[color:var(--dash-accent,#111111)] bg-[color:var(--dash-accent,#111111)]/10 text-[color:var(--dash-accent,#111111)]"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900",
                  )}
                >
                  {isSelected ? (
                    <CheckSquare className="size-4 shrink-0" />
                  ) : (
                    <Square className="size-4 shrink-0 text-slate-300" />
                  )}
                  {day}
                </button>
              );
            })}
          </div>
        </FieldGroup>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <FieldGroup label="Start Time" htmlFor="schedule-start" required>
            <input
              id="schedule-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={cn(surfaceInputClassName, "field-control")}
            />
          </FieldGroup>

          <FieldGroup label="End Time" htmlFor="schedule-end" required>
            <input
              id="schedule-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={cn(surfaceInputClassName, "field-control")}
            />
          </FieldGroup>

          <FieldGroup label="Break Duration" htmlFor="schedule-break" required>
            <select
              id="schedule-break"
              value={breakSelectValue}
              onChange={(e) => setBreakDuration(e.target.value)}
              className={cn(surfaceSelectClassName, "field-control")}
            >
              {BREAK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </FieldGroup>
        </div>

        {isDirty ? (
          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
            <AppButton
              variant="primary"
              type="button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </AppButton>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CompanySettingSchedule;
