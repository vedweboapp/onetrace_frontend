"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchJob, updateJob } from "@/features/jobs/api/job.api";
import { JobDetailBody } from "@/features/jobs/components/job-detail-body";
import { JobUpdateStatusDialog } from "@/features/jobs/components/job-update-status-dialog";
import type { Job } from "@/features/jobs/types/job.types";
import { getJobAssignedWorkerId, getJobStatusId } from "@/features/jobs/utils/job-nested-fields.util";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import {
  EntityDetailEditButton,
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton } from "@/shared/ui";

type Props = {
  jobId: number;
};

export function JobDetailScreen({ jobId }: Props) {
  const t = useTranslations("Dashboard.jobs");
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [workerLabelById, setWorkerLabelById] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opts = await loadTechnicianOptions();
        if (!cancelled) {
          const map: Record<number, string> = {};
          for (const o of opts) {
            const id = Number.parseInt(o.value, 10);
            if (Number.isFinite(id)) map[id] = o.label;
          }
          setWorkerLabelById(map);
        }
      } catch {
        if (!cancelled) setWorkerLabelById({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <EntityDetailScreen
      entityId={jobId}
      listSection="jobs"
      listRoute={routes.dashboard.jobs}
      loadError={t("detailLoadError")}
      fetch={fetchJob}
      getTitle={(detail) => detail.title}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      actions={({ detail, listBack, retry }) => (
        <JobDetailActions
          detail={detail}
          listBack={listBack}
          statusOpen={statusOpen}
          statusSaving={statusSaving}
          onOpenStatus={() => setStatusOpen(true)}
          onCloseStatus={() => setStatusOpen(false)}
          onStatusSaved={() => {
            setStatusOpen(false);
            retry();
          }}
          setStatusSaving={setStatusSaving}
          t={t}
        />
      )}
      renderSurface={({ detail, loading, error, retry, dateFmt }) =>
        loading ? (
          <EntityDetailLoadingSkeleton />
        ) : error ? (
          <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />
        ) : detail ? (
          <JobDetailBody
            detail={detail}
            dateFmt={dateFmt}
            workerLabel={
              (() => {
                const id = getJobAssignedWorkerId(detail);
                return id != null ? workerLabelById[id] : undefined;
              })()
            }
          />
        ) : null
      }
    />
  );
}

function JobDetailActions({
  detail,
  listBack,
  statusOpen,
  statusSaving,
  onOpenStatus,
  onCloseStatus,
  onStatusSaved,
  setStatusSaving,
  t,
}: {
  detail: Job;
  listBack: string;
  statusOpen: boolean;
  statusSaving: boolean;
  onOpenStatus: () => void;
  onCloseStatus: () => void;
  onStatusSaved: () => void;
  setStatusSaving: (v: boolean) => void;
  t: ReturnType<typeof useTranslations<"Dashboard.jobs">>;
}) {
  async function handleStatusUpdate(jobStatusId: number) {
    setStatusSaving(true);
    try {
      await updateJob(detail.id, { job_status: jobStatusId });
      toastSuccess(t("statusUpdatedToast"));
      onStatusSaved();
    } catch {
      toastError(t("statusUpdateError"));
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <AppButton type="button" variant="secondary" size="sm" onClick={onOpenStatus}>
        {t("updateStatus.action")}
      </AppButton>
      <EntityDetailEditButton
        label={t("detail.editWithIcon")}
        listBack={listBack}
        fallbackRoute={routes.dashboard.jobs}
      />
      <JobUpdateStatusDialog
        open={statusOpen}
        currentStatusId={getJobStatusId(detail)}
        jobTitle={detail.title}
        saving={statusSaving}
        onClose={onCloseStatus}
        onConfirm={(id) => void handleStatusUpdate(id)}
      />
    </div>
  );
}
