"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchJob, updateJob } from "@/features/jobs/api/job.api";
import { JobDetailBody } from "@/features/jobs/components/job-detail-body";
import { JobUpdateStatusDialog } from "@/features/jobs/components/job-update-status-dialog";
import type { Job } from "@/features/jobs/types/job.types";
import { getJobAssignedWorkerId, getJobStatusId } from "@/features/jobs/utils/job-nested-fields.util";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import {
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { AppButton } from "@/shared/ui";
import { EditButton } from "@/shared/ui/dashboard-action-buttons";
import { buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";

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
      getTitle={(detail) => detail.job_serial_number ?? String(detail.id)}
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
            onChecklistsUpdated={retry}
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function openEdit() {
    const jobCategory =
      searchParams.get("job_category")?.trim() ||
      (typeof detail.job_category === "string" ? detail.job_category.trim() : "");
    const editPath = buildPathWithStoredBack(`${pathname}/edit`, listBack);
    const targetUrl = jobCategory
      ? `${editPath}?job_category=${encodeURIComponent(jobCategory)}`
      : editPath;
    router.push(targetUrl);
  }

  async function handleStatusUpdate(jobStatusId: number) {
    setStatusSaving(true);
    try {
      await updateJob(detail.id, { job_status: jobStatusId });
      toastSuccess(t("statusUpdatedToast"));
      onStatusSaved();
    } catch (error) {
      toastApiError(error, t("statusUpdateError"));
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <AppButton type="button" variant="secondary" size="sm" onClick={onOpenStatus}>
        {t("updateStatus.action")}
      </AppButton>
      <EditButton onClick={openEdit}>{t("detail.editWithIcon")}</EditButton>
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
