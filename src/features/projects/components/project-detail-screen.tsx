"use client";

import * as React from "react";
import { FileText, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { fetchClient } from "@/features/clients/api/client.api";
import { createQuotationFromProject } from "@/features/quotations/api/quotation.api";
import { deleteProject, fetchProject } from "@/features/projects/api/project.api";
import { ProjectDetailBody } from "@/features/projects/components/project-detail-body";
import { ProjectDrawingsTab } from "@/features/projects/components/project-drawings-tab";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { routes } from "@/shared/config/routes";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { mergeUrlQueryParam, sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import {
  AppButton,
  AppTabs,
  type AppTabItem,
  ConfirmDialog,
  DashboardUnderDevelopmentState,
  SurfaceShell,
} from "@/shared/ui";

type Props = {
  projectId: number;
};

export function ProjectDetailScreen({ projectId }: Props) {
  const t = useTranslations("Dashboard.projects");
  const tHome = useTranslations("Dashboard.home");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "projects");

  const [detail, setDetail] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const [clientName, setClientName] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [quoting, setQuoting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("details");

  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "details", label: t("detail.tabs.details") },
      { id: "forms", label: t("detail.tabs.forms") },
      { id: "drawings", label: t("detail.tabs.drawings") },
      { id: "locations", label: t("detail.tabs.locations") },
      { id: "specs", label: t("detail.tabs.specs") },
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

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const dateOnlyFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
      }),
    [locale],
  );

  function formatDay(iso: string | undefined) {
    if (!iso) return "—";
    const d = iso.slice(0, 10);
    if (!d) return "—";
    try {
      return dateOnlyFmt.format(new Date(`${d}T12:00:00`));
    } catch {
      return "—";
    }
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const row = await fetchProject(projectId);
        if (!cancelled) setDetail(row);
      } catch {
        if (!cancelled) setError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshNonce, t]);

  React.useEffect(() => {
    if (!detail) {
      queueMicrotask(() => setClientName(null));
      return;
    }
    const cid = getProjectClientId(detail);
    if (!cid) {
      queueMicrotask(() => setClientName(null));
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
  }, [detail]);

  const subtitleClientId = detail ? getProjectClientId(detail) : null;

  async function confirmDelete() {
    if (!detail) return;
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
    <div className="pb-12">
      <div className="mb-5 space-y-4 border-b border-slate-200/90 pb-5 dark:border-slate-800 sm:mb-6 sm:pb-6">
        <DetailPageHeader
          title={detail?.name ?? (loading ? t("detail.loadingTitle") : t("detailMetaTitle"))}
          backHref={safeBack}
          backAriaLabel={t("detail.backAria")}
          subtitle={
            detail ? (
              <span className="text-slate-500 dark:text-slate-400">
                {clientName ?? (subtitleClientId ? `#${subtitleClientId}` : "—")}
                <span className="mx-2 text-slate-300 dark:text-slate-600" aria-hidden>
                  •
                </span>
                {formatDay(detail.start_date)} – {formatDay(detail.end_date)}
              </span>
            ) : undefined
          }
          actions={
            !loading && !error && detail ? (
              <div className="flex flex-wrap gap-2">
                <AppButton
                  type="button"
                  variant="secondary"
                  size="md"
                  className="gap-2"
                  loading={quoting}
                  disabled={quoting}
                  aria-label={t("detail.quoteToProjectAria")}
                  onClick={() => void handleQuoteProject()}
                >
                  <FileText className="size-4" strokeWidth={2} aria-hidden />
                  {t("detail.quoteToProject")}
                </AppButton>
                <AppButton type="button" variant="secondary" size="md" onClick={() => setDeleteOpen(true)}>
                  {t("delete")}
                </AppButton>
                <AppButton
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() =>
                    router.push(
                      `${routes.dashboard.projects}/${projectId}/edit?back=${encodeURIComponent(safeBack ?? routes.dashboard.projects)}`,
                    )
                  }
                  className="gap-2"
                >
                  <Pencil className="size-4" strokeWidth={2} aria-hidden />
                  {t("detail.editWithIcon")}
                </AppButton>
              </div>
            ) : null
          }
        />
        <AppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={setActiveTab}
          ariaLabel={t("detail.tabsAria")}
          panelIdPrefix="project-detail-tab"
          className="-mx-1 px-1 sm:-mx-0 sm:px-0"
        />
      </div>

      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        <div
          role="tabpanel"
          id={`project-detail-tab-${activeTab}`}
          aria-labelledby={`project-detail-tab-trigger-${activeTab}`}
        >
          {loading && activeTab === "details" ? (
            <div className="space-y-3 p-4 sm:p-6">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : error && activeTab === "details" ? (
            <div className="space-y-4 p-4 sm:p-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <AppButton type="button" variant="secondary" size="md" onClick={() => setRefreshNonce((k) => k + 1)}>
                {t("detail.retry")}
              </AppButton>
            </div>
          ) : detail && activeTab === "details" ? (
            <ProjectDetailBody detail={detail} dateFmt={dateFmt} dateOnlyFmt={dateOnlyFmt} clientName={clientName} />
          ) : loading ? (
            <div className="space-y-3 p-4 sm:p-6">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : error ? (
            <div className="space-y-4 p-4 sm:p-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <AppButton type="button" variant="secondary" size="md" onClick={() => setRefreshNonce((k) => k + 1)}>
                {t("detail.retry")}
              </AppButton>
            </div>
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
      </SurfaceShell>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={detail?.name}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
