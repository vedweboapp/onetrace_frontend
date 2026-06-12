"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { JobFormChecklistGateModal } from "@/features/job-forms/components/job-form-checklist-gate-modal";
import { updateJobChecklists } from "@/features/jobs/api/job.api";
import type { JobChecklistItem, JobFormRef } from "@/features/jobs/types/job.types";
import {
  jobChecklistUpdatePayload,
  requiredJobChecklistsComplete,
} from "@/features/jobs/utils/job-nested-fields.util";
import { routes } from "@/shared/config/routes";
import { toastError } from "@/shared/feedback/app-toast";
import { cn } from "@/core/utils/http.util";

type Props = {
  jobId: number;
  forms: JobFormRef[];
  checklists?: JobChecklistItem[];
  checklistMarked?: boolean;
  backHref?: string;
  onChecklistsUpdated?: () => void;
};

function isSubmittedForm(form: JobFormRef): boolean {
  if (typeof form.is_submitted === "boolean") return form.is_submitted;
  return typeof form.submitted_form_id === "number" && form.submitted_form_id > 0;
}

export function JobFormsSection({
  jobId,
  forms,
  checklists = [],
  checklistMarked = false,
  backHref,
  onChecklistsUpdated,
}: Props) {
  const t = useTranslations("Dashboard.jobs.forms");
  const router = useRouter();
  const jobDetailHref = backHref ?? `${routes.dashboard.jobs}/${jobId}`;

  const [gateOpen, setGateOpen] = React.useState(false);
  const [gateSaving, setGateSaving] = React.useState(false);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const [pendingFormLabel, setPendingFormLabel] = React.useState("");
  const [gateChecklists, setGateChecklists] = React.useState(checklists);

  const hasChecklists = checklists.length > 0;
  const checklistsComplete = requiredJobChecklistsComplete(checklists, { isMarked: checklistMarked });

  React.useEffect(() => {
    setGateChecklists(checklists);
  }, [checklists]);

  if (forms.length === 0) return null;

  function buildFormHref(form: JobFormRef, label: string): string {
    const submitted = isSubmittedForm(form);
    const hrefBase = `${routes.dashboard.jobFormFill(jobId, form.project_form_id, form.id)}&name=${encodeURIComponent(label)}&back=${encodeURIComponent(jobDetailHref)}`;
    const submissionId =
      typeof form.submitted_form_id === "number" && form.submitted_form_id > 0
        ? form.submitted_form_id
        : null;
    return submitted && submissionId ? `${hrefBase}&submissionId=${submissionId}` : hrefBase;
  }

  function openForm(form: JobFormRef) {
    const submitted = isSubmittedForm(form);
    const label = form.name?.trim() || `#${form.project_form_id}`;
    const href = buildFormHref(form, label);

    if (submitted || !hasChecklists || checklistsComplete) {
      router.push(href);
      return;
    }

    setGateChecklists(checklists);
    setPendingHref(href);
    setPendingFormLabel(label);
    setGateOpen(true);
  }

  async function handleGateConfirm(items: JobChecklistItem[]) {
    if (!pendingHref) return;
    setGateSaving(true);
    try {
      await updateJobChecklists(jobId, jobChecklistUpdatePayload(items));
      onChecklistsUpdated?.();
      setGateOpen(false);
      router.push(pendingHref);
      setPendingHref(null);
    } catch {
      toastError(t("checklistSaveError"));
    } finally {
      setGateSaving(false);
    }
  }

  return (
    <>
      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("sectionTitle")}
        </p>
        <ul className="flex flex-wrap gap-2">
          {forms.map((form) => {
            const submitted = isSubmittedForm(form);
            const label = form.name?.trim() || `#${form.project_form_id}`;
            const checklistLocked = !submitted && hasChecklists && !checklistsComplete;

            return (
              <li key={`${form.id}-${form.project_form_id}`}>
                <button
                  type="button"
                  onClick={() => openForm(form)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm transition",
                    checklistLocked
                      ? "cursor-pointer border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:border-[color:var(--dash-accent)] hover:text-[color:var(--dash-accent)] dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100",
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      submitted
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : checklistLocked
                          ? "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                    )}
                  >
                    {submitted ? t("statusSubmitted") : t("statusPending")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <JobFormChecklistGateModal
        open={gateOpen}
        formLabel={pendingFormLabel}
        checklists={gateChecklists}
        saving={gateSaving}
        onClose={() => {
          if (gateSaving) return;
          setGateOpen(false);
          setPendingHref(null);
        }}
        onConfirm={(items) => void handleGateConfirm(items)}
      />
    </>
  );
}
