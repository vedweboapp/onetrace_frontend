"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Briefcase,
  MoreHorizontal,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { deleteSchedule } from "@/features/scheduling/api/schedule.api";
import type { Schedule } from "@/features/scheduling/types/schedule.types";
import { ScheduleDeleteSummary } from "@/features/scheduling/components/schedule-delete-summary";
import { scheduleJobLabel } from "@/features/scheduling/utils/schedule-map.util";
import { formatDurationHours } from "@/features/scheduling/utils/scheduling-time.util";
import {
  apiDateToKey,
  formatDayHeader,
  formatTimeRange,
  parseDateKey,
} from "@/features/scheduling/utils/scheduling-week.util";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppModal, ConfirmDialog } from "@/shared/ui";
import { initialsFromName } from "@/features/scheduling/utils/scheduling-technician.util";

type Props = {
  schedule: Schedule | null;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  onEdit?: (schedule: Schedule) => void;
};

export function ScheduleDetailModal({ schedule, open, onClose, onDeleted, onEdit }: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) {
      setMenuOpen(false);
      setDeleteOpen(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const node = e.target as Node;
      if (menuRef.current?.contains(node) || triggerRef.current?.contains(node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  if (!schedule) return null;

  const dayKey = apiDateToKey(schedule.start_at);
  const dayDate = dayKey ? parseDateKey(dayKey) : new Date();
  const titleDate = formatDayHeader(dayDate, locale, t("today"));
  const timeLabel = schedule.all_day
    ? t("detail.allDay")
    : `${formatTimeRange(schedule.start_at, schedule.end_at, locale)} (${formatDurationHours(schedule.start_at, schedule.end_at)})`;

  async function handleDelete() {
    if (!schedule) return;
    setDeleting(true);
    try {
      await deleteSchedule(schedule.id);
      toastSuccess(t("detail.deletedToast"));
      setDeleteOpen(false);
      onDeleted?.();
      onClose();
    } catch (error) {
      toastApiError(error, t("detail.deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  const jobLabel = scheduleJobLabel(schedule);

  return (
    <>
      <AppModal
        open={open}
        onClose={() => (!deleting ? onClose() : undefined)}
        showCloseButton={false}
        size="md"
        isBusy={deleting}
        className="overflow-visible"
        title={
          <div className="flex items-start justify-between gap-3 pr-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t("detail.title", { date: titleDate })}
            </h2>
            <div className="flex shrink-0 items-center gap-1">
              <div className="relative">
                <button
                  ref={triggerRef}
                  type="button"
                  aria-label={t("detail.moreOptions")}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="inline-flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <MoreHorizontal className="size-4" />
                </button>
                {menuOpen ? (
                  <div
                    ref={menuRef}
                    role="menu"
                    aria-label={t("detail.moreOptions")}
                    className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-sky-200 bg-white py-1 shadow-lg dark:border-sky-900 dark:bg-slate-900"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit?.(schedule);
                      }}
                    >
                      {t("detail.edit")}
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => {
                        setMenuOpen(false);
                        toastSuccess(t("detail.timesheetSoon"));
                      }}
                    >
                      {t("detail.createTimesheet")}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => {
                        setMenuOpen(false);
                        toastSuccess(t("detail.replacementSoon"));
                      }}
                    >
                      {t("detail.findReplacement")}
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                    >
                      {t("detail.delete")}
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                aria-label={t("detail.close")}
                className="inline-flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={onClose}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        }
      >
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-sm font-semibold uppercase text-white"
            aria-hidden
          >
            {initialsFromName(schedule.worker_name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {schedule.worker_name}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {t("modal.currentTitle", { title: schedule.worker_title })}
            </p>
          </div>
        </div>

        <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
          <DetailRow icon={Briefcase} label={jobLabel} />
          <DetailRow icon={UserRound} label={schedule.worker_title} />
          <DetailRow icon={UserRound} label={schedule.client_name} />
          <DetailRow icon={Sun} label={timeLabel} />
        </ul>
      </AppModal>

      <ConfirmDialog
        open={deleteOpen}
        title={t("detail.deleteConfirmTitle")}
        body={t("detail.deleteConfirmBody")}
        highlight={<ScheduleDeleteSummary schedule={schedule} />}
        confirmLabel={t("detail.delete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}

function DetailRow({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
      <span className="min-w-0 flex-1">{label}</span>
    </li>
  );
}
