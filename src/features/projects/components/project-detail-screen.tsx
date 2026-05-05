"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { fetchClient, fetchClientsPage } from "@/features/clients/api/client.api";
import { deleteProject, fetchProject } from "@/features/projects/api/project.api";
import { ProjectDetailBody } from "@/features/projects/components/project-detail-body";
import { ProjectDrawingsTab } from "@/features/projects/components/project-drawings-tab";
import { ProjectFormModal } from "@/features/projects/components/project-form-modal";
import type { Project } from "@/features/projects/types/project.types";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { PageHeadingWithBack } from "@/shared/components/layout/page-heading-with-back";
import { routes } from "@/shared/config/routes";
import { useRouter } from "@/i18n/navigation";
import {
  AppButton,
  AppTabs,
  type AppTabItem,
  ConfirmDialog,
  SurfaceShell,
} from "@/shared/ui";

type Props = {
  projectId: number;
};

export function ProjectDetailScreen({ projectId }: Props) {
  const t = useTranslations("Dashboard.projects");
  const tCommon = useTranslations("Dashboard.common");
  const locale = useLocale();
  const router = useRouter();

  const [detail, setDetail] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const [clientName, setClientName] = React.useState<string | null>(null);
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);

  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
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

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchClientsPage(1, 500);
        if (!cancelled) {
          setClientOptions(items.map((c) => ({ value: String(c.id), label: c.name })));
        }
      } catch {
        if (!cancelled) setClientOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    let cancelled = false;
    (async () => {
      try {
        const c = await fetchClient(detail.client);
        if (!cancelled) setClientName(c.name);
      } catch {
        if (!cancelled) setClientName(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail]);

  function openEdit() {
    if (!detail) return;
    setFormOpen(true);
  }

  function handleFormSaved() {
    setRefreshNonce((n) => n + 1);
  }

  function scheduleSummary(d: Project) {
    const s = d.start_date?.slice(0, 10);
    const e = d.end_date?.slice(0, 10);
    if (!s || !e) return "";
    try {
      return `${dateOnlyFmt.format(new Date(`${s}T12:00:00`))} → ${dateOnlyFmt.format(new Date(`${e}T12:00:00`))}`;
    } catch {
      return "";
    }
  }

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

  return (
    <div className="pb-12">
      <div className="mb-5 space-y-4 border-b border-slate-200/90 pb-5 dark:border-slate-800 sm:mb-6 sm:pb-6">
        <PageHeadingWithBack
          backHref={routes.dashboard.projects}
          backAriaLabel={tCommon("back")}
          title={detail?.name ?? (loading ? t("detail.loadingTitle") : t("detailMetaTitle"))}
          description={
            detail && !loading && !error
              ? [clientName ?? `Client #${detail.client}`, scheduleSummary(detail)].filter(Boolean).join(" · ") ||
                undefined
              : undefined
          }
          actions={
            !loading && !error && detail ? (
              <>
                <AppButton type="button" variant="secondary" size="md" onClick={() => setDeleteOpen(true)}>
                  {t("delete")}
                </AppButton>
                <AppButton type="button" variant="primary" size="md" onClick={openEdit}>
                  {t("detail.edit")}
                </AppButton>
              </>
            ) : undefined
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

      <SurfaceShell>
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
            <ProjectDetailBody detail={detail} dateFmt={dateFmt} dateOnlyFmt={dateOnlyFmt} clientName={clientName} t={t} />
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
            <div className="p-4 sm:p-6">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t("detail.tabPlaceholder")}</p>
            </div>
          ) : null}
        </div>
      </SurfaceShell>

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode="edit"
        project={detail}
        clientOptions={clientOptions}
        onSaved={handleFormSaved}
      />

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
