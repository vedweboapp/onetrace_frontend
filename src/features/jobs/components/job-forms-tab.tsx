"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  fetchJobSubmittedForm,
  fetchJobWorkerFormSubmissions,
} from "@/features/job-forms/api/job-form.api";
import type { WorkerFormSubmissionTableRow } from "@/features/job-forms/types/job-form-submission.types";
import type { Job } from "@/features/jobs/types/job.types";
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
};

export function JobFormsTab({ detail }: Props) {
  const t = useTranslations("Dashboard.jobs");
  const router = useRouter();
  const dateFmt = useDashboardDateFormat();
  const [rows, setRows] = React.useState<WorkerFormSubmissionTableRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [openingSubmissionId, setOpeningSubmissionId] = React.useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

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
          setLoadError(t("detail.formsLoadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.id, t, refreshNonce]);

  async function openSubmission(row: WorkerFormSubmissionTableRow) {
    if (openingSubmissionId != null) return;
    setOpeningSubmissionId(row.id);
    try {
      // GET /jobs/{jobId}/submitted-forms/{submissionId}/
      const submission = await fetchJobSubmittedForm(detail.id, row.id);
      const formId = submission.project_form_id ?? submission.form_id;
      const jobFormId = submission.job_form_id;
      if (!formId || formId <= 0) {
        toastApiError(new Error("Missing form identifiers"), t("forms.loadError"));
        return;
      }
      const resolvedJobFormId = jobFormId > 0 ? jobFormId : formId;
      const formName =
        row.project_form_name.trim() || submission.form_name?.trim() || t("forms.untitledForm");
      const back = `${routes.dashboard.jobs}/${detail.id}?tab=forms`;
      const href = `${routes.dashboard.jobFormFill(detail.id, formId, resolvedJobFormId)}&submission_id=${row.id}&name=${encodeURIComponent(formName)}&back=${encodeURIComponent(back)}`;
      router.push(href);
    } catch (error) {
      toastApiError(error, t("forms.loadError"));
    } finally {
      setOpeningSubmissionId(null);
    }
  }

  return (
    <DetailTabListShell
      loading={loading}
      loadError={loadError}
      isEmpty={rows.length === 0}
      loadingFallback={<EntityDetailTabLoadingState />}
      emptyFallback={
        <DashboardEmptyState
          fill
          iconName="default"
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
          <DetailPanelCard title={t("detail.formsTitle")}>
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
                        if (!busy) void openSubmission(row);
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
        </div>
      </DetailPagePadding>
    </DetailTabListShell>
  );
}
