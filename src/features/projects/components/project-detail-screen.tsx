"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { fetchClient } from "@/features/clients/api/client.api";
import { fetchProjectTypesPage } from "@/features/project-types/api/project-type.api";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import { createQuotationFromProject } from "@/features/quotations/api/quotation.api";
import { deleteProject, fetchProject, patchProject, updateProject } from "@/features/projects/api/project.api";
import { ProjectDetailBody } from "@/features/projects/components/project-detail-body";
import { ProjectDrawingsTab } from "@/features/projects/components/project-drawings-tab";
import { ProjectFormsTab } from "@/features/projects/components/project-forms-tab";
import { ProjectJobsTab } from "@/features/projects/components/project-jobs-tab";
import { ProjectQuotationsTab } from "@/features/projects/components/project-quotations-tab";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { projectTypesById } from "@/features/projects/utils/project-type-id.util";
import {
  EntityDetailDeleteEditActions,
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import {
  AppButton,
  AppTabs,
  type AppTabItem,
  CheckmarkSelect,
  ConfirmDialog,
  DashboardUnderDevelopmentState,
} from "@/shared/ui";
import ProjectPinsListTab from "./project-pins-list-tab";
import { fetchProjectStatusesPage } from "@/features/project-status/api/project-status.api";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";

type Props = {
  projectId: number;
};

export function ProjectDetailScreen({ projectId }: Props) {
  const t = useTranslations("Dashboard.projects");
  const tHome = useTranslations("Dashboard.home");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateFmt = useDashboardDateFormat();
  const dateOnlyFmt = useDashboardDateFormat({ dateOnly: true });

  const [clientName, setClientName] = React.useState<string | null>(null);
  const [projectTypeById, setProjectTypeById] = React.useState<Record<number, ProjectType>>({});
  const [detailForClient, setDetailForClient] = React.useState<Project | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [quoting, setQuoting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("details");
  const [togglingActive, setTogglingActive] = React.useState(false);

  // --- Project Status Dialog ---
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [statusOptions, setStatusOptions] = React.useState<WorkflowColourStatus[]>([]);
  const [selectedStatusId, setSelectedStatusId] = React.useState<string>("");
  const [updatingStatus, setUpdatingStatus] = React.useState(false);

  // Load all project statuses once
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchProjectStatusesPage(1, 500, { is_active: true });
        if (!cancelled) setStatusOptions(items);
      } catch {
        if (!cancelled) setStatusOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sync selected status when dialog opens (pre-select current status)
  React.useEffect(() => {
    if (!statusDialogOpen) return;
    const current = detailForClient?.project_status;
    if (typeof current === "object" && current !== null) {
      setSelectedStatusId(String(current.id));
    } else if (typeof current === "number") {
      setSelectedStatusId(String(current));
    } else {
      setSelectedStatusId("");
    }
  }, [statusDialogOpen, detailForClient]);

  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "details", label: t("detail.tabs.details") },
      { id: "forms", label: t("detail.tabs.forms") },
      { id: "drawings", label: t("detail.tabs.drawings") },
      { id: "jobs", label: t("detail.tabs.jobs") },
      {id:"location",label: t("detail.tabs.location")},
      { id: "quotations", label: t("detail.tabs.quotations") },
      { id: "jobsheets", label: t("detail.tabs.jobsheets") },
      { id: "docs", label: t("detail.tabs.docs") },
      { id: "approvals", label: t("detail.tabs.approvals") },
    ],
    [t],
  );

  const allowedDetailTabIds = React.useMemo(() => new Set(detailTabs.map((x) => x.id)), [detailTabs]);

  React.useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab || !allowedDetailTabIds.has(tab)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTab(tab);
    const p = new URLSearchParams(searchParams.toString());
    p.delete("tab");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [searchParams, pathname, router, allowedDetailTabIds]);

  React.useEffect(() => {
    if (!detailForClient) {
      setClientName(null);
      return;
    }
    const cid = getProjectClientId(detailForClient);
    if (!cid) {
      setClientName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const c = await fetchClient(cid, { silent: true });
        if (!cancelled) setClientName(c.name);
      } catch {
        if (!cancelled) setClientName(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailForClient]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchProjectTypesPage(1, 500);
        if (!cancelled) setProjectTypeById(projectTypesById(items));
      } catch {
        if (!cancelled) setProjectTypeById({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmDelete(detail: Project) {
    setDeleting(true);
    try {
      await deleteProject(detail.id);
      toastSuccess(t("deletedToast"));
      setDeleteOpen(false);
      router.push(routes.dashboard.projects);
    } catch (error) {
      toastApiError(error, t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  async function handleQuoteProject() {
    setQuoting(true);
    try {
      const q = await createQuotationFromProject(projectId);
      toastSuccess(t("detail.quoteFromProjectToast"));
      router.push(
        buildEntityDetailHrefAfterSave(
          routes.dashboard.quotations,
          q.id,
          `${routes.dashboard.projects}/${projectId}`,
        ),
      );
    } catch (error) {
      toastApiError(error, t("detail.quoteFromProjectError"));
    } finally {
      setQuoting(false);
    }
  }

  return (
    <EntityDetailScreen
      entityId={projectId}
      className="pb-8 sm:pb-10"
      listSection="projects"
      listRoute={routes.dashboard.projects}
      loadError={t("detailLoadError")}
      fetch={fetchProject}
      getTitle={(detail) => detail.name}
      onDetailChange={setDetailForClient}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      headerExtension={
        <AppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={setActiveTab}
          ariaLabel={t("detail.tabsAria")}
          panelIdPrefix="project-detail-tab"
          className="-mx-1 px-1 sm:-mx-0 sm:px-0"
        />
      }
      actions={({ detail, listBack, retry }) => (
        <div className="flex flex-wrap items-center gap-2">
          {/* Update Status Button */}
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setStatusDialogOpen(true)}
          >
            Update Status
          </AppButton>

          {/* Update Status Dialog */}
          {statusDialogOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget && !updatingStatus) setStatusDialogOpen(false); }}
            >
              <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Update Project Status
                </h2>

                {/* Current Status chip */}
                {(() => {
                  const cur = detail.project_status;
                  const statusRef = typeof cur === "object" && cur !== null ? cur : null;
                  const curOption = statusRef
                    ? statusOptions.find((s) => s.id === statusRef.id)
                    : null;
                  const label = curOption?.status_name ?? statusRef?.name ?? null;
                  const bg = curOption?.bg_colour ?? statusRef?.bg_color ?? null;
                  const textClr = curOption?.text_colour ?? statusRef?.text_color ?? null;

                  return label ? (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Current:</span>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: bg ?? "#E5E7EB", color: textClr ?? "#374151" }}
                      >
                        {label}
                      </span>
                    </div>
                  ) : null;
                })()}

                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Select New Status
                  </label>
                  <CheckmarkSelect
                    listLabel="Project Status"
                    buttonAriaLabel="Select project status"
                    options={statusOptions.map((s) => ({ value: String(s.id), label: s.status_name }))}
                    value={selectedStatusId}
                    emptyLabel="Select status…"
                    portaled
                    searchable
                    clearable
                    className="w-full"
                    onChange={(v) => setSelectedStatusId(v ?? "")}
                  />
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <AppButton
                    variant="secondary"
                    size="sm"
                    disabled={updatingStatus}
                    onClick={() => setStatusDialogOpen(false)}
                  >
                    Cancel
                  </AppButton>
                  <AppButton
                    variant="primary"
                    size="sm"
                    loading={updatingStatus}
                    disabled={updatingStatus || !selectedStatusId}
                    onClick={async () => {
                      if (!selectedStatusId) return;
                      setUpdatingStatus(true);
                      try {
                        await updateProject(detail.id, { project_status: Number(selectedStatusId) });
                        toastSuccess("Project status updated");
                        setStatusDialogOpen(false);
                        retry();
                      } catch (error) {
                        toastApiError(error, "Failed to update project status");
                      } finally {
                        setUpdatingStatus(false);
                      }
                    }}
                  >
                    Update Status
                  </AppButton>
                </div>
              </div>
            </div>
          )}

          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            loading={quoting}
            disabled={quoting}
            aria-label={t("detail.quoteToProjectAria")}
            onClick={() => void handleQuoteProject()}
          >
            {t("detail.quoteToProjectShort")}
          </AppButton>
          <EntityDetailDeleteEditActions
            onDelete={() => setDeleteOpen(true)}
            listBack={listBack}
            fallbackRoute={routes.dashboard.projects}
          />
        </div>
      )}
      footer={
        <ConfirmDialog
          open={deleteOpen}
          onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
          onConfirm={() => {
            if (detailForClient) void confirmDelete(detailForClient);
          }}
          title={t("deleteConfirmTitle")}
          body={t("deleteConfirmBody")}
          highlight={detailForClient?.name}
          confirmLabel={t("confirmDelete")}
          cancelLabel={t("modal.cancel")}
          isBusy={deleting}
        />
      }
      renderSurface={({ detail, loading, error, retry }) => (
        <div
          role="tabpanel"
          id={`project-detail-tab-${activeTab}`}
          aria-labelledby={`project-detail-tab-trigger-${activeTab}`}
          className={activeTab === "location" ? "w-full overflow-y-auto" : undefined}
          style={activeTab === "location" ? { maxHeight: "calc(100dvh - 200px)" } : undefined}
        >
          {loading && activeTab === "details" ? (
            <EntityDetailLoadingSkeleton />
          ) : error && activeTab === "details" ? (
            <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />
          ) : detail && activeTab === "details" ? (
            <ProjectDetailBody
              detail={detail}
              dateFmt={dateFmt}
              dateOnlyFmt={dateOnlyFmt}
              clientName={clientName}
              projectTypeById={projectTypeById}
            />
          ) : loading ? (
            <EntityDetailLoadingSkeleton />
          ) : error ? (
            <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />
          ) : detail && activeTab === "drawings" ? (
            <ProjectDrawingsTab projectId={detail.id} />
          ) : detail && activeTab === "forms" ? (
            <ProjectFormsTab />
          ) : detail && activeTab === "jobs" ? (
            <ProjectJobsTab projectId={detail.id} />
          ) : detail && activeTab === "quotations" ? (
            <ProjectQuotationsTab projectId={detail.id} />
          ) : detail && activeTab === "location" ? (
            <ProjectPinsListTab sites={detail.sites} />
          ) : activeTab !== "details" ? (
            <DashboardUnderDevelopmentState
              className="rounded-none"
              title={tHome("title")}
              description={tHome("body")}
            />
          ) : null}
        </div>
      )}
    />
  );
}
