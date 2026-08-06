"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchJob, updateJob } from "@/features/jobs/api/job.api";
import { JobDetailBody } from "@/features/jobs/components/job-detail-body";
import { JobMaterialsTab } from "@/features/jobs/components/job-materials-tab";
import { JobDispatchTab } from "@/features/jobs/components/job-dispatch-tab";
import { JobReturnsTab } from "@/features/jobs/components/job-returns-tab";
import { JobUpdateStatusDialog } from "@/features/jobs/components/job-update-status-dialog";
import { JobQualityAssuranceControls } from "@/features/jobs/components/job-quality-assurance-controls";
import type { Job } from "@/features/jobs/types/job.types";
import { isQualityAssuranceDecided } from "@/features/jobs/types/quality-assurance.types";
import { getJobAssignedWorkerId, getJobStatusId } from "@/features/jobs/utils/job-nested-fields.util";
import { isJobStatusCompleted } from "@/features/jobs/utils/quality-assurance-eligibility.util";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import {
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { AppButton, AppTabs, type AppTabItem } from "@/shared/ui";
import { EditButton } from "@/shared/ui/dashboard-action-buttons";
import { buildCurrentPageBackHref, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";

function normalizeJobCategory(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

function isServiceJobCategory(value: string | null | undefined): boolean {
  return normalizeJobCategory(value) === "servicejob";
}

type Props = {
  jobId: number;
};

type JobDetailTabId = "overview" | "materials" | "dispatch" | "returns";

function isJobDetailTabId(value: string | null): value is JobDetailTabId {
  return value === "overview" || value === "materials" || value === "dispatch" || value === "returns";
}

export function JobDetailScreen({ jobId }: Props) {
  const t = useTranslations("Dashboard.jobs");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [workerLabelById, setWorkerLabelById] = React.useState<Record<number, string>>({});
  const tabFromUrl = searchParams.get("tab");
  const activeTab: JobDetailTabId = isJobDetailTabId(tabFromUrl) ? tabFromUrl : "overview";

  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "overview", label: t("detail.tabs.overview") },
      { id: "materials", label: t("detail.tabs.materials") },
      { id: "dispatch", label: t("detail.tabs.dispatch") },
      { id: "returns", label: t("detail.tabs.returns") },
    ],
    [t],
  );

  function handleTabChange(tab: string) {
    if (!isJobDetailTabId(tab)) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    if (tab === "overview") nextParams.delete("tab");
    else nextParams.set("tab", tab);
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

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
      headerExtension={
        <AppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={handleTabChange}
          ariaLabel={t("detail.tabsAria")}
          panelIdPrefix="job-detail-tab"
          className="-mx-1 px-1 sm:-mx-0 sm:px-0"
        />
      }
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
        (
          <div
            role="tabpanel"
            id={`job-detail-tab-${activeTab}`}
            aria-labelledby={`job-detail-tab-trigger-${activeTab}`}
          >
            {loading ? (
              <EntityDetailLoadingSkeleton />
            ) : error ? (
              <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />
            ) : detail && activeTab === "overview" ? (
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
            ) : detail && activeTab === "materials" ? (
              <JobMaterialsTab detail={detail} />
            ) : detail && activeTab === "dispatch" ? (
              <JobDispatchTab detail={detail} />
            ) : detail && activeTab === "returns" ? (
              <JobReturnsTab detail={detail} />
            ) : null}
          </div>
        )
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
    const detailBackHref = buildCurrentPageBackHref(pathname, searchParams);
    const editPath = buildPathWithStoredBack(`${pathname}/edit`, detailBackHref);
    const targetUrl = jobCategory
      ? `${editPath}?job_category=${encodeURIComponent(jobCategory)}`
      : editPath;
    router.push(targetUrl);
  }

  const showQualityAssurance =
    (isServiceJobCategory(searchParams.get("job_category")) ||
      isServiceJobCategory(detail.job_category)) &&
    isJobStatusCompleted(detail) &&
    !isQualityAssuranceDecided(detail.job_quality_assurance);

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
    <div className="flex flex-wrap items-center gap-2">
      {showQualityAssurance ? (
        <JobQualityAssuranceControls jobId={detail.id} onSuccess={onStatusSaved} />
      ) : null}
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
