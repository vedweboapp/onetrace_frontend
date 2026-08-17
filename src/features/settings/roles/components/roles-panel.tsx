"use client";

import * as React from "react";
import { LayoutGrid, List, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/core/utils/http.util";
import { usePathname, useRouter } from "@/i18n/navigation";
import { deleteRole, fetchRolesList } from "@/features/settings/roles/api/role.api";
import type { Role } from "@/features/settings/roles/types/role.types";
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

export function RolesPanel() {
  const t = useTranslations("Dashboard.roles");
  const tList = useTranslations("Dashboard.list");
  const router = useRouter();
  const pathname = usePathname();
  const { search, listViewMode, setUrl, setListViewMode } = useListUrlState();

  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const loadRoles = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchRolesList();
      setRoles(data);
    } catch {
      setLoadError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const filteredRoles = React.useMemo(() => {
    if (!search?.trim()) return roles;
    const query = search.toLowerCase().trim();
    return roles.filter((r) => {
      const name = (r.role_name || r.name || "").toLowerCase();
      const desc = (r.description || "").toLowerCase();
      return name.includes(query) || desc.includes(query);
    });
  }, [roles, search]);

  const parentMap = React.useMemo(() => {
    const map = new Map<number, string>();
    roles.forEach((r) => {
      map.set(r.id, r.role_name || r.name || `Role #${r.id}`);
    });
    return map;
  }, [roles]);

  const handleView = React.useCallback(
    (id: number) => {
      router.push(`/settings/roles/${id}`);
    },
    [router],
  );

  const handleEdit = React.useCallback(
    (id: number) => {
      router.push(`/settings/roles/${id}/edit`);
    },
    [router],
  );

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deleteRole(deletingId);
      toastSuccess(t("deletedToast"));
      setDeletingId(null);
      await loadRoles();
    } catch (err) {
      toastApiError(err, t("saveError"));
    } finally {
      setDeleting(false);
    }
  };

  const columns = React.useMemo(() => {
    const col = entityCol<Role>();
    return [
      col.primary("role_name", t("fields.roleName"), (row) => row.role_name || row.name || `Role #${row.id}`),
      col.text("parent_role", t("fields.parentRole"), (row) => {
        if (!row.parent_role) return "—";
        return (
          row.parent_role_detail?.role_name ||
          row.parent_role_detail?.name ||
          parentMap.get(row.parent_role) ||
          `Role #${row.parent_role}`
        );
      }),
      col.custom("shared_data_with_peers", t("fields.sharedDataWithPeers"), (row) =>
        row.shared_data_with_peers ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            Yes
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            No
          </span>
        ),
      ),
      col.text("description", t("fields.description"), (row) => row.description?.trim() || "—"),
      col.actions("actions", "", (row) => (
        <DataTableRowActionsMenu
          menuAriaLabel={t("fields.roleName")}
          items={[
            {
              id: "edit",
              label: t("edit"),
              icon: Pencil,
              onSelect: () => handleEdit(row.id),
            },
            {
              id: "delete",
              label: "Delete",
              tone: "danger",
              icon: Trash2,
              onSelect: () => setDeletingId(row.id),
            },
          ]}
        />
      )),
    ];
  }, [handleEdit, parentMap, t]);

  return (
    <div className={listPageRootClassName()}>
      <ListPageHeader
        title={t("title")}
        description={t("subtitle")}
        showViewToggle={false}
      />

      <SurfaceShell className={listPageSurfaceShellClassName(false)}>
        {/* Toolbar: Search on left, Add button + view toggle on right */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800/80">
          <ListPageSearchField
            value={search}
            onCommit={(q) => setUrl({ search: q.trim() || null, page: null }, { replace: true })}
            placeholder={t("placeholders.roleName")}
            ariaLabel={t("fields.roleName")}
          />

          <div className="flex shrink-0 items-center gap-2">
            <AddButton onClick={() => router.push("/settings/roles/create")}>
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
            <AppButton variant="secondary" size="sm" className="mt-3" onClick={loadRoles}>
              Retry
            </AppButton>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-8">
            <DashboardEmptyState
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <AddButton onClick={() => router.push("/settings/roles/create")}>
                  {t("add")}
                </AddButton>
              }
            />
          </div>
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {filteredRoles.map((row) => (
                <ListPageCard
                  key={row.id}
                  dataListRowId={row.id}
                  title={row.role_name || row.name || `Role #${row.id}`}
                  subtitle={
                    row.parent_role
                      ? `${t("fields.parentRole")}: ${
                          row.parent_role_detail?.role_name ||
                          row.parent_role_detail?.name ||
                          parentMap.get(row.parent_role) ||
                          `Role #${row.parent_role}`
                        }`
                      : undefined
                  }
                  description={row.description || "—"}
                  meta={
                    row.shared_data_with_peers ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Shared with peers
                      </span>
                    ) : undefined
                  }
          onCardClick={() => handleView(row.id)}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={t("fields.roleName")}
                      items={[
                        {
                          id: "edit",
                          label: t("edit"),
                          icon: Pencil,
                          onSelect: () => handleEdit(row.id),
                        },
                        {
                          id: "delete",
                          label: "Delete",
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
            rows={filteredRoles}
            onRowClick={(r) => handleView(r.id)}
          />
        )}
      </SurfaceShell>

      <ConfirmDialog
        open={deletingId != null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Role"
        body="Are you sure you want to delete this role? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        isBusy={deleting}
      />
    </div>
  );
}
