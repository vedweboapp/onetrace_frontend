"use client";

import * as React from "react";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchJob, updateJob } from "@/features/jobs/api/job.api";
import { JobDetailBody } from "@/features/jobs/components/job-detail-body";
import { JobMaterialsTab } from "@/features/jobs/components/job-materials-tab";
import { JobDispatchTab } from "@/features/jobs/components/job-dispatch-tab";
import { JobReturnsTab } from "@/features/jobs/components/job-returns-tab";
import { JobFormsTab } from "@/features/jobs/components/job-forms-tab";
import { JobSchedulingTab } from "@/features/jobs/components/job-scheduling-tab";
import { JobUpdateStatusDialog } from "@/features/jobs/components/job-update-status-dialog";
import { JobQualityAssuranceControls } from "@/features/jobs/components/job-quality-assurance-controls";
import {
  parseJobCategoryParam,
  resolveJobCategory,
  isServiceJobCategory,
} from "@/features/jobs/constants/job-category";
import type { Job } from "@/features/jobs/types/job.types";
import { isQualityAssuranceDecided } from "@/features/jobs/types/quality-assurance.types";
import { getJobStatusId } from "@/features/jobs/utils/job-nested-fields.util";
import { isJobStatusCompleted } from "@/features/jobs/utils/quality-assurance-eligibility.util";
import {
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { entityDetailTabPanelClassName } from "@/shared/components/layout/detail-tab-layout";
import { routes } from "@/shared/config/routes";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { AppButton, AppTabs, type AppTabItem } from "@/shared/ui";
import { EditButton } from "@/shared/ui/dashboard-action-buttons";
import { buildCurrentPageBackHref, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  jobId: number;
};

type JobDetailTabId = "overview" | "scheduling" | "materials" | "dispatch" | "returns" | "forms";

function isJobDetailTabId(value: string | null): value is JobDetailTabId {
  return (
    value === "overview" ||
    value === "scheduling" ||
    value === "materials" ||
    value === "dispatch" ||
    value === "returns" ||
    value === "forms"
  );
}

function isServiceJobDetail(detail: Job | null, jobCategoryParam: string | null): boolean {
  if (isServiceJobCategory(jobCategoryParam)) return true;
  if (detail) return isServiceJobCategory(detail.job_category);
  return false;
}

export function JobDetailScreen({ jobId }: Props) {
  const t = useTranslations("Dashboard.jobs");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [detailForNav, setDetailForNav] = React.useState<Job | null>(null);
  const tabFromUrl = searchParams.get("tab");
  const showFormsTab = isServiceJobDetail(detailForNav, searchParams.get("job_category"));
  const activeTab: JobDetailTabId =
    isJobDetailTabId(tabFromUrl) && (tabFromUrl !== "forms" || showFormsTab)
      ? tabFromUrl
      : "overview";

  const detailTabs = React.useMemo<AppTabItem[]>(() => {
    const tabs: AppTabItem[] = [
      { id: "overview", label: t("detail.tabs.overview") },
      { id: "scheduling", label: t("detail.tabs.scheduling") },
      { id: "materials", label: t("detail.tabs.materials") },
      { id: "dispatch", label: t("detail.tabs.dispatch") },
      { id: "returns", label: t("detail.tabs.returns") },
    ];
    if (showFormsTab) {
      tabs.push({ id: "forms", label: t("detail.tabs.forms") });
    }
    return tabs;
  }, [showFormsTab, t]);

  function handleTabChange(tab: string) {
    if (!isJobDetailTabId(tab)) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    if (tab === "overview") nextParams.delete("tab");
    else nextParams.set("tab", tab);
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  /** Keep header/sidebar job category in sync when opening detail without `?job_category=`. */
  React.useEffect(() => {
    if (!detailForNav) return;
    const resolved = resolveJobCategory(detailForNav);
    const current = parseJobCategoryParam(searchParams.get("job_category"));
    if (current === resolved) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("job_category", resolved);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [detailForNav, pathname, router, searchParams]);

  const prevTabRef = React.useRef(activeTab);
  const reloadQuietRef = React.useRef<(() => Promise<void>) | null>(null);

  React.useEffect(() => {
    const prev = prevTabRef.current;
    prevTabRef.current = activeTab;
    if (prev === "scheduling" && activeTab === "overview") {
      void reloadQuietRef.current?.();
    }
  }, [activeTab]);

  const bindReloadQuiet = React.useCallback((fn: () => Promise<void>) => {
    reloadQuietRef.current = fn;
  }, []);

  return (
    <EntityDetailScreen
      entityId={jobId}
      listSection="jobs"
      listRoute={routes.dashboard.jobs}
      loadError={t("detailLoadError")}
      fetch={fetchJob}
      onDetailChange={setDetailForNav}
      getTitle={(detail) => detail.job_serial_number ?? String(detail.id)}
      wrapSurface={activeTab !== "scheduling"}
      className={
        activeTab === "scheduling"
          ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden pb-0 sm:pb-0"
          : undefined
      }
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
      renderSurface={({ detail, loading, error, retry, reloadQuiet, dateFmt }) => (
        <JobDetailTabPanel
          activeTab={activeTab}
          detail={detail}
          loading={loading}
          error={error}
          retry={retry}
          reloadQuiet={reloadQuiet}
          dateFmt={dateFmt}
          bindReloadQuiet={bindReloadQuiet}
          onOpenScheduling={() => handleTabChange("scheduling")}
          t={t}
        />
      )}
    />
  );
}

function JobDetailTabPanel({
  activeTab,
  detail,
  loading,
  error,
  retry,
  reloadQuiet,
  dateFmt,
  bindReloadQuiet,
  onOpenScheduling,
  t,
}: {
  activeTab: JobDetailTabId;
  detail: Job | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  reloadQuiet: () => Promise<void>;
  dateFmt: Intl.DateTimeFormat;
  bindReloadQuiet: (fn: () => Promise<void>) => void;
  onOpenScheduling: () => void;
  t: ReturnType<typeof useTranslations<"Dashboard.jobs">>;
}) {
  React.useEffect(() => {
    bindReloadQuiet(reloadQuiet);
  }, [bindReloadQuiet, reloadQuiet]);

  return (
        <div
          role="tabpanel"
          id={`job-detail-tab-${activeTab}`}
          aria-labelledby={`job-detail-tab-trigger-${activeTab}`}
          className={cn(
            activeTab === "scheduling" ||
              activeTab === "materials" ||
              activeTab === "dispatch" ||
              activeTab === "returns" ||
              activeTab === "forms"
              ? "flex min-h-0 flex-1 flex-col"
              : entityDetailTabPanelClassName,
          )}
        >
          {loading ? (
            <EntityDetailLoadingSkeleton />
          ) : error ? (
            <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />
          ) : detail && activeTab === "overview" ? (
            <JobDetailBody
              detail={detail}
              dateFmt={dateFmt}
              onChecklistsUpdated={retry}
              onSaved={retry}
              onOpenScheduling={onOpenScheduling}
            />
          ) : detail && activeTab === "scheduling" ? (
            <Suspense
              fallback={
                <div className="space-y-2 p-4">
                  <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                  <div className="h-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                </div>
              }
            >
              <JobSchedulingTab detail={detail} onJobSchedulesChanged={() => void reloadQuiet()} />
            </Suspense>
          ) : detail && activeTab === "materials" ? (
            <JobMaterialsTab detail={detail} />
          ) : detail && activeTab === "dispatch" ? (
            <JobDispatchTab detail={detail} />
          ) : detail && activeTab === "returns" ? (
            <JobReturnsTab detail={detail} />
          ) : detail && activeTab === "forms" ? (
            <JobFormsTab detail={detail} />
          ) : null}
        </div>
  );
}

function JobDetailActions({
  detail,
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
    const jobCategory = resolveJobCategory(detail);
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
