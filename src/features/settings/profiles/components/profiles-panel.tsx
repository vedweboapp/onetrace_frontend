"use client";

import * as React from "react";
import { LayoutGrid, List, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/core/utils/http.util";
import { useRouter } from "@/i18n/navigation";
import { deleteProfile, fetchProfilesList } from "@/features/settings/profiles/api/profile.api";
import type { Profile } from "@/features/settings/profiles/types/profile.types";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import {
  AddButton,
  AppButton,
  ConfirmDialog,
  DataTableRowActionsMenu,
  DashboardEmptyState,
  listPageSurfaceShellClassName,
  listPageRootClassName,
  ListPageCard,
  ListPageCardGrid,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";

export function ProfilesPanel() {
  const t = useTranslations("Dashboard.profiles");
  const tList = useTranslations("Dashboard.list");
  const router = useRouter();
  const { search, listViewMode, setUrl, setListViewMode } = useListUrlState();

  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const loadProfiles = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchProfilesList();
      setProfiles(data);
    } catch {
      setLoadError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const filteredProfiles = React.useMemo(() => {
    if (!search?.trim()) return profiles;
    const query = search.toLowerCase().trim();
    return profiles.filter((p) => {
      const name = (p.profile_name || "").toLowerCase();
      const type = (p.profile_type || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return name.includes(query) || type.includes(query) || desc.includes(query);
    });
  }, [profiles, search]);

  const handleView = React.useCallback(
    (id: number) => {
      router.push(`/settings/profiles/${id}`);
    },
    [router],
  );

  const handleEdit = React.useCallback(
    (id: number) => {
      router.push(`/settings/profiles/${id}/edit`);
    },
    [router],
  );

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deleteProfile(deletingId);
      toastSuccess(t("deletedToast"));
      setDeletingId(null);
      await loadProfiles();
    } catch (err) {
      toastApiError(err, t("saveError"));
    } finally {
      setDeleting(false);
    }
  };

  const columns = React.useMemo(() => {
    const col = entityCol<Profile>();
    return [
      col.primary("profile_name", t("fields.profileName"), (row) => row.profile_name || `Profile #${row.id}`),
      col.text("profile_type", t("fields.profileType"), (row) => row.profile_type?.trim() || "—"),
      col.text("description", t("fields.description"), (row) => row.description?.trim() || "—"),
      col.actions("actions", "", (row) => (
        <DataTableRowActionsMenu
          menuAriaLabel={t("fields.profileName")}
          items={[
            {
              id: "view",
              label: t("view"),
              icon: Pencil,
              onSelect: () => handleView(row.id),
            },
            {
              id: "edit",
              label: t("edit"),
              icon: Pencil,
              onSelect: () => handleEdit(row.id),
            },
            {
              id: "delete",
              label: t("delete"),
              tone: "danger",
              icon: Trash2,
              onSelect: () => setDeletingId(row.id),
            },
          ]}
        />
      )),
    ];
  }, [handleView, handleEdit, t]);

  return (
    <div className={listPageRootClassName()}>
      <ListPageHeader
        title={t("title")}
        description={t("subtitle")}
        showViewToggle={false}
      />

      <SurfaceShell className={listPageSurfaceShellClassName(false)}>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80">
          <ListPageSearchField
            value={search}
            onCommit={(q) => setUrl({ search: q.trim() || null, page: null }, { replace: true })}
            placeholder={t("placeholders.profileName")}
            ariaLabel={t("fields.profileName")}
          />

          <div className="flex shrink-0 items-center gap-2">
            <AddButton onClick={() => router.push("/settings/profiles/create")}>
              {t("add")}
            </AddButton>

            <div className="inline-flex h-9 shrink-0 items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setListViewMode("list")}
                title={tList("cardView")}
                aria-label={tList("cardView")}
                aria-pressed={listViewMode === "list"}
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-md transition-colors",
                  listViewMode === "list"
                    ? "bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-300",
                )}
              >
                <LayoutGrid className="size-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setListViewMode("table")}
                title={tList("tableView")}
                aria-label={tList("tableView")}
                aria-pressed={listViewMode === "table"}
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-md transition-colors",
                  listViewMode === "table"
                    ? "bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-300",
                )}
              >
                <List className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : loadError ? (
          <div className="p-6 text-center">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{loadError}</p>
            <AppButton variant="secondary" size="sm" className="mt-3" onClick={loadProfiles}>
              {t("detail.retry")}
            </AppButton>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <DashboardEmptyState
            iconName="default"
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <AddButton onClick={() => router.push("/settings/profiles/create")}>
                {t("add")}
              </AddButton>
            }
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {filteredProfiles.map((row) => (
                <ListPageCard
                  key={row.id}
                  dataListRowId={row.id}
                  title={row.profile_name || `Profile #${row.id}`}
                  subtitle={row.profile_type || undefined}
                  description={row.description || "—"}
                  onCardClick={() => handleView(row.id)}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={t("fields.profileName")}
                      items={[
                        {
                          id: "edit",
                          label: t("edit"),
                          icon: Pencil,
                          onSelect: () => handleEdit(row.id),
                        },
                        {
                          id: "delete",
                          label: t("delete"),
                          tone: "danger",
                          icon: Trash2,
                          onSelect: () => setDeletingId(row.id),
                        },
                      ]}
                    />
                  }
                />
              ))}
            </ListPageCardGrid>
          </div>
        ) : (
          <EntityDataTable
            columns={columns}
            rows={filteredProfiles}
            onRowClick={(r) => handleView(r.id)}
          />
        )}
      </SurfaceShell>

      <ConfirmDialog
        open={deletingId != null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title={t("deleteTitle")}
        body={t("deleteBody")}
        confirmLabel={t("delete")}
        cancelLabel={t("modal.cancel")}
        confirmVariant="danger"
        isBusy={deleting}
      />
    </div>
  );
}
