"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CheckSquare, Square, Clock, ChevronDown } from "lucide-react";
import { updateOrganizationDetails } from "../api/company-settings.api";
import { toastSuccess, toastError } from "@/shared/feedback/app-toast";
import { useTranslations } from "next-intl";
import { parseApiFailurePayload, resolveApiErrorUserText } from "@/core/errors/api-error-text";
import { OrganizationDetails } from "../types/types";
import {
  buildDirtyOrganizationPatch,
  hasDirtyFields,
  SCHEDULE_TAB_FIELDS,
} from "../utils/company-settings-diff.util";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const BREAK_OPTIONS = ["15 minutes", "30 minutes", "45 minutes", "1 hour"];

interface CompanySettingScheduleProps {
  initialData: OrganizationDetails;
  onSaveSuccess?: (data: OrganizationDetails) => void;
}

const CompanySettingSchedule = ({ initialData, onSaveSuccess }: CompanySettingScheduleProps) => {
  const t = useTranslations("Dashboard.settingsCompany");
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [workingDays, setWorkingDays] = useState<string[]>(
    initialData.workingDays && initialData.workingDays.length > 0
      ? initialData.workingDays
      : ["monday", "tuesday", "wednesday", "thursday", "friday"]
  );
  const [startTime, setStartTime] = useState(initialData.startTime || "09:00");
  const [endTime, setEndTime] = useState(initialData.endTime || "17:00");
  const [breakDuration, setBreakDuration] = useState(initialData.breakDuration || "30 minutes");

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
    const patch = buildDirtyOrganizationPatch(initialData, current, SCHEDULE_TAB_FIELDS);
    return hasDirtyFields(patch);
  }, [initialData, workingDays, startTime, endTime, breakDuration]);

  const toggleDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
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
      toastError(resolveApiErrorUserText(parseApiFailurePayload(error)));
    } finally {
      setIsSaving(false);
    }
  };

  const timezoneDisplay = initialData.timezone || "GMT+0";

  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 p-0 shadow-sm flex flex-col transition-opacity duration-500 mt-2 ${isMounted ? "animate-in fade-in duration-500 opacity-100" : "opacity-0"}`}>

      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Working Schedule</h2>
        <span className="text-sm font-medium text-slate-500">Current Timezone: {timezoneDisplay}</span>
      </div>

      <div className="p-8 flex flex-col gap-8">

        {/* Operational Days */}
        <div className="flex flex-col gap-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Operational Days
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = workingDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors duration-200 ${isSelected
                    ? "bg-blue-50 border-blue-500 text-blue-600"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                >
                  {isSelected ? (
                    <CheckSquare className="size-4.5 fill-blue-500 text-white" />
                  ) : (
                    <Square className="size-4.5 text-slate-300 stroke-[2]" />
                  )}
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Start Time */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Start Time
            </label>
            <div className="relative">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                style={{ colorScheme: "light" }}
              />
              {/* <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 pointer-events-none" /> */}
            </div>
          </div>

          {/* End Time */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              End Time
            </label>
            <div className="relative">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                style={{ colorScheme: "light" }}
              />
              {/* <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 pointer-events-none" /> */}
            </div>
          </div>

          {/* Break Duration */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Break Duration
            </label>
            <div className="relative">
              <input
                type="time"
                value={breakDuration}
                onChange={(e) => setBreakDuration(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Action Button – only visible when something changed */}
        {isDirty && (
          <div className="flex justify-end pt-4 mt-2 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 active:scale-[0.98] transition-all text-white text-sm font-semibold rounded-[8px] shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default CompanySettingSchedule;