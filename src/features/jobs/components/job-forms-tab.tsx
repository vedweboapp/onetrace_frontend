"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { JobFormsSection } from "@/features/job-forms/components/job-forms-section";
import { fetchJobWorkerFormSubmissions } from "@/features/job-forms/api/job-form.api";
import type { WorkerFormSubmissionTableRow } from "@/features/job-forms/types/job-form-submission.types";
import type { Job } from "@/features/jobs/types/job.types";
import {
  jobChecklistEntries,
  jobChecklistIsMarked,
  jobFormEntries,
} from "@/features/jobs/utils/job-nested-fields.util";
import { EntityDetailErrorState, EntityDetailTabLoadingState } from "@/shared/components/entity";
import { entityNameLinkClassName } from "@/shared/components/entity/detail-entity-link";
import {
  DetailLinkedTable,
  DetailLinkedTableRow,
  DetailLinkedTableTd,
  detailLinkedTableCellClassName,
} from "@/shared/components/layout/detail-linked-table";
import { DetailTabListShell } from "@/shared/components/layout/detail-tab-list-shell";
import {
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { toastApiError } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { DashboardEmptyState } from "@/shared/ui";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  detail: Job;
  /** When opening a form/submission, return here instead of the job Forms tab. */
  backHref?: string;
  /** Refresh job detail after checklist gate saves (keeps form status in sync). */
  onJobUpdated?: () => void;
};

function resolveFormIdsForSubmission(detail: Job, row: WorkerFormSubmissionTableRow) {
  const entries = jobFormEntries(detail);
  const bySubmission = entries.find((entry) => entry.submitted_form_id === row.id);
  if (bySubmission) {
    return {
      formId: bySubmission.project_form_id,
      jobFormId: bySubmission.id,
    };
  }

  const nameKey = row.project_form_name.trim().toLowerCase();
  if (nameKey) {
    const byName = entries.find((entry) => (entry.name ?? "").trim().toLowerCase() === nameKey);
    if (byName) {
      return {
        formId: byName.project_form_id,
        jobFormId: byName.id,
      };
    }
  }

  const listFormId = row.project_form_id != null && row.project_form_id > 0 ? row.project_form_id : null;
  const listJobFormId = row.job_form_id != null && row.job_form_id > 0 ? row.job_form_id : null;
  if (listFormId != null || listJobFormId != null) {
    return {
      formId: listFormId ?? listJobFormId ?? 0,
      jobFormId: listJobFormId ?? listFormId ?? 0,
    };
  }

  return null;
}

export function JobFormsTab({ detail, backHref, onJobUpdated }: Props) {
  const t = useTranslations("Dashboard.jobs");
  const router = useRouter();
  const dateFmt = useDashboardDateFormat();
  const forms = React.useMemo(() => jobFormEntries(detail), [detail]);
  const checklists = React.useMemo(() => jobChecklistEntries(detail), [detail]);
  const checklistMarked = React.useMemo(() => jobChecklistIsMarked(detail), [detail]);
  const [rows, setRows] = React.useState<WorkerFormSubmissionTableRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [openingSubmissionId, setOpeningSubmissionId] = React.useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const jobBackHref = backHref?.trim() || `${routes.dashboard.jobs}/${detail.id}?tab=forms`;
  const hasAssignedForms = forms.length > 0;
  const hasSubmissions = rows.length > 0;

  const reload = React.useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const list = await fetchJobWorkerFormSubmissions(detail.id);
        if (!cancelled) setRows(list);
      } catch {
        if (!cancelled) {
          setRows([]);
          // Assigned forms can still be shown; only surface error when nothing else to show.
          if (!hasAssignedForms) setLoadError(t("detail.formsLoadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.id, t, refreshNonce, hasAssignedForms]);

  function openSubmission(row: WorkerFormSubmissionTableRow) {
    if (openingSubmissionId != null) return;
    setOpeningSubmissionId(row.id);
    try {
      const resolved = resolveFormIdsForSubmission(detail, row);
      const formName = row.project_form_name.trim() || t("forms.untitledForm");
      const common = `submission_id=${row.id}&name=${encodeURIComponent(formName)}&back=${encodeURIComponent(jobBackHref)}&for_qa=true`;

      if (resolved && resolved.formId > 0) {
        const jobFormId = resolved.jobFormId > 0 ? resolved.jobFormId : resolved.formId;
        router.push(
          `${routes.dashboard.jobFormFill(detail.id, resolved.formId, jobFormId)}&${common}`,
        );
        return;
      }

      // Submitted-forms detail often omits project_form_id; open view-only with submission_id.
      router.push(`${routes.dashboard.jobs}/${detail.id}/form?${common}`);
    } catch (error) {
      toastApiError(error, t("forms.loadError"));
    } finally {
      setOpeningSubmissionId(null);
    }
  }

  return (
    <DetailTabListShell
      loading={loading && !hasAssignedForms && !hasSubmissions}
      loadError={loadError}
      isEmpty={!loading && !loadError && !hasAssignedForms && !hasSubmissions}
      loadingFallback={<EntityDetailTabLoadingState />}
      emptyFallback={
        <DashboardEmptyState
          fill
          iconName="forms"
          title={t("forms.sectionTitle")}
          description={t("detail.formsEmpty")}
        />
      }
      errorFallback={
        <EntityDetailErrorState
          fill
          message={loadError ?? t("detail.formsLoadError")}
          retryLabel={t("detail.retry")}
          onRetry={reload}
        />
      }
    >
      <DetailPagePadding>
        <div className={detailPageStackClassName}>
          {hasAssignedForms ? (
            <DetailPanelCard title={t("detail.formsTitle")} collapsible={false}>
              <JobFormsSection
                jobId={detail.id}
                forms={forms}
                checklists={checklists}
                checklistMarked={checklistMarked}
                backHref={jobBackHref}
                hideTitle
                onChecklistsUpdated={() => {
                  onJobUpdated?.();
                  reload();
                }}
              />
            </DetailPanelCard>
          ) : null}

          {hasSubmissions ? (
            <DetailPanelCard title={t("detail.formsSubmissionsTitle")}>
              <div className="mt-3">
                <DetailLinkedTable
                  columns={[
                    { id: "id", header: t("detail.formsTable.id"), widthClass: "w-[12%]", narrow: true },
                    { id: "worker", header: t("detail.formsTable.workerName"), widthClass: "w-[28%]" },
                    { id: "form", header: t("detail.formsTable.projectFormName"), widthClass: "w-[34%]" },
                    {
                      id: "submittedAt",
                      header: t("detail.formsTable.submittedAt"),
                      widthClass: "w-[26%]",
                      narrow: true,
                    },
                  ]}
                  showRowNumbers={false}
                >
                  {rows.map((row) => {
                    const busy = openingSubmissionId === row.id;
                    return (
                      <DetailLinkedTableRow
                        key={row.id}
                        index={row.id}
                        showRowNumber={false}
                        clickable
                        className={cn(busy && "opacity-60")}
                        onClick={() => {
                          if (!busy) openSubmission(row);
                        }}
                      >
                        <DetailLinkedTableTd
                          narrow
                          className={detailLinkedTableCellClassName({
                            narrow: true,
                            cellClassName: "tabular-nums",
                          })}
                        >
                          <span className={entityNameLinkClassName}>{row.id}</span>
                        </DetailLinkedTableTd>
                        <DetailLinkedTableTd className={detailLinkedTableCellClassName({})}>
                          {row.worker_name || "—"}
                        </DetailLinkedTableTd>
                        <DetailLinkedTableTd
                          className={detailLinkedTableCellClassName({
                            cellClassName: "font-medium text-slate-900 dark:text-slate-100",
                          })}
                        >
                          <span className={entityNameLinkClassName}>
                            {row.project_form_name || "—"}
                          </span>
                        </DetailLinkedTableTd>
                        <DetailLinkedTableTd
                          narrow
                          className={detailLinkedTableCellClassName({
                            narrow: true,
                            cellClassName: "tabular-nums",
                          })}
                        >
                          {formatFlexibleApiDate(row.submitted_at, dateFmt) || "—"}
                        </DetailLinkedTableTd>
                      </DetailLinkedTableRow>
                    );
                  })}
                </DetailLinkedTable>
              </div>
            </DetailPanelCard>
          ) : null}
        </div>
      </DetailPagePadding>
    </DetailTabListShell>
  );
}
