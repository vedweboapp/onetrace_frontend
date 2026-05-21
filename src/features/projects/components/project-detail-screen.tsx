"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { fetchClient } from "@/features/clients/api/client.api";
import { fetchProjectTypesPage } from "@/features/project-types/api/project-type.api";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import { createQuotationFromProject } from "@/features/quotations/api/quotation.api";
import { deleteProject, fetchProject } from "@/features/projects/api/project.api";
import { ProjectDetailBody } from "@/features/projects/components/project-detail-body";
import { ProjectDrawingsTab } from "@/features/projects/components/project-drawings-tab";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { projectTypesById } from "@/features/projects/utils/project-type-id.util";
import {
  EntityDetailDeleteEditActions,
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";
import {
  AppButton,
  AppTabs,
  type AppTabItem,
  ConfirmDialog,
  DashboardUnderDevelopmentState,
} from "@/shared/ui";

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

  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "details", label: t("detail.tabs.details") },
      { id: "forms", label: t("detail.tabs.forms") },
      { id: "drawings", label: t("detail.tabs.drawings") },
      { id: "jobs", label: t("detail.tabs.jobs") },
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
    } catch {
      toastError(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  async function handleQuoteProject() {
    setQuoting(true);
    try {
      const q = await createQuotationFromProject(projectId);
      toastSuccess(t("detail.quoteFromProjectToast"));
      router.push(mergeUrlQueryParam(routes.dashboard.quotations, "highlight", String(q.id)));
    } catch {
      toastError(t("detail.quoteFromProjectError"));
    } finally {
      setQuoting(false);
    }
  }

  return (
    <EntityDetailScreen
      entityId={projectId}
      listSection="projects"
      listRoute={routes.dashboard.projects}
      loadError={t("detailLoadError")}
      fetch={fetchProject}
      getTitle={(detail) => detail.name}
      onDetailChange={setDetailForClient}
      labels={{
        loadingTitle: t("detail.loadingTitle"),
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
      actions={({ detail, listBack }) => (
        <div className="flex flex-wrap gap-2">
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
          ) : activeTab !== "details" ? (
            <DashboardUnderDevelopmentState
              className="min-h-[calc(100vh-280px)] rounded-none px-4 sm:min-h-[420px] sm:px-6"
              title={tHome("title")}
              description={tHome("body")}
            />
          ) : null}
        </div>
      )}
    />
  );
}
