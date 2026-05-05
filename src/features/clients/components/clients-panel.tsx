"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { ClientFormModal } from "@/features/clients/components/client-form-modal";
import type { Client } from "@/features/clients/types/client.types";
import { cn } from "@/core/utils/http.util";
import { routes } from "@/shared/config/routes";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import {
  AppButton,
  DataTable,
  DataTableBody,
  DataTableEmptyRow,
  DataTableHead,
  DataTablePaginationBar,
  DataTableRow,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";

export function ClientsPanel() {
  const t = useTranslations("Dashboard.clients");
  const tList = useTranslations("Dashboard.list");
  const locale = useLocale();
  const router = useRouter();

  const { page, search, setUrl, setPage } = useListUrlState();

  const [items, setItems] = React.useState<Client[]>([]);
  const [pagination, setPagination] = React.useState({
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
    next: null as string | null,
    previous: null as string | null,
  });
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [formClient, setFormClient] = React.useState<Client | null>(null);

  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchClientsPage(page, 20, {
          search: search || undefined,
        });
        if (!cancelled) {
          setItems(nextItems);
          setPagination(p);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t("loadError"));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, search, refreshNonce, t]);

  function openCreate() {
    setFormMode("create");
    setFormClient(null);
    setFormOpen(true);
  }

  function handleFormSaved() {
    setRefreshNonce((n) => n + 1);
  }

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <ListPageSearchField
          value={search}
          onCommit={commitSearch}
          placeholder={tList("searchPlaceholder")}
          ariaLabel={tList("searchAria")}
          className="sm:max-w-sm"
        />
        <AppButton type="button" variant="primary" size="md" onClick={openCreate} className="shrink-0 gap-2 self-start sm:self-center">
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          {t("add")}
        </AppButton>
      </div>

      <SurfaceShell>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : loading ? (
          <div className="space-y-2 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : (
          <DataTableScroll>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableTh>{t("table.name")}</DataTableTh>
                  <DataTableTh className="hidden md:table-cell">{t("table.contact")}</DataTableTh>
                  <DataTableTh className="hidden sm:table-cell">{t("table.email")}</DataTableTh>
                  <DataTableTh className="hidden lg:table-cell">{t("table.phone")}</DataTableTh>
                  <DataTableTh className="hidden sm:table-cell">{t("table.status")}</DataTableTh>
                  <DataTableTh className="hidden xl:table-cell">{t("table.created")}</DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {items.length === 0 ? (
                  <DataTableEmptyRow message={t("empty")} colSpan={6} />
                ) : (
                  items.map((row) => (
                    <DataTableRow
                      key={row.id}
                      clickable
                      onClick={() => router.push(`${routes.dashboard.clients}/${row.id}`)}
                    >
                      <DataTableTd className="font-medium text-slate-900 dark:text-slate-100">{row.name}</DataTableTd>
                      <DataTableTd className="hidden text-slate-700 dark:text-slate-300 md:table-cell">
                        {row.contact_person}
                      </DataTableTd>
                      <DataTableTd className="hidden max-w-[200px] truncate sm:table-cell">{row.email}</DataTableTd>
                      <DataTableTd className="hidden text-slate-600 dark:text-slate-400 lg:table-cell">
                        {row.phone?.trim() ? row.phone : "—"}
                      </DataTableTd>
                      <DataTableTd className="hidden sm:table-cell">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                            row.is_active
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                          )}
                        >
                          {row.is_active ? t("status.active") : t("status.inactive")}
                        </span>
                      </DataTableTd>
                      <DataTableTd className="hidden text-slate-500 dark:text-slate-400 xl:table-cell">
                        {dateFmt.format(new Date(row.created_at))}
                      </DataTableTd>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </DataTableScroll>
        )}

        {!loading && !loadError && items.length > 0 ? (
          <DataTablePaginationBar
            pagination={pagination}
            summary={t("pageLabel", {
              current: pagination.current_page,
              total: pagination.total_pages,
              count: pagination.total_records,
            })}
            prevLabel={t("prev")}
            nextLabel={t("next")}
            onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
            onNext={() => setPage(pagination.current_page + 1)}
          />
        ) : null}
      </SurfaceShell>

      <ClientFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        client={formClient}
        onSaved={handleFormSaved}
      />
    </div>
  );
}
