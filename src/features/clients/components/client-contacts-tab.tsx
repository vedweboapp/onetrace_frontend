"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import type { Contact } from "@/features/contacts/types/contact.types";
import { EntityDataTable, EntityDetailLoadingSkeleton, entityCol } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { buildQuickCreateNavigateHref } from "@/shared/utils/quick-create-navigation.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { AddButton, DashboardEmptyState, DataTablePaginationBar, ListPageSearchField } from "@/shared/ui";

type Props = {
  clientId: number;
};

export function ClientContactsTab({ clientId }: Props) {
  const t = useTranslations("Dashboard.clients");
  const tContacts = useTranslations("Dashboard.contacts");
  const tList = useTranslations("Dashboard.list");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateFmt = useDashboardDateFormat();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState<Contact[]>([]);
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
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const clientDetailHref = pathname;

  const returnTo = React.useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "contacts");
    return `${pathname}?${params.toString()}`;
  }, [pathname, searchParams]);

  const columns = React.useMemo(() => {
    const c = entityCol<Contact>();
    return [
      c.primary("name", tContacts("table.name"), (r) => r.name),
      c.truncate("email", tContacts("table.email"), (r) => r.email),
      c.phone("phone", tContacts("table.phone"), (r) => r.phone),
      c.status(
        "status",
        tContacts("table.status"),
        (r) => r.is_active,
        tContacts("status.active"),
        tContacts("status.inactive"),
      ),
      c.date("created", tContacts("table.created"), (r) => r.created_at, dateFmt),
    ];
  }, [tContacts, dateFmt]);

  const commitSearch = React.useCallback((q: string) => {
    setSearch(q.trim());
    setPage(1);
  }, []);

  const reloadList = React.useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  useQuickCreateReturn({
    onApplySelect: () => reloadList(),
  });

  const openCreateContact = React.useCallback(() => {
    router.push(buildQuickCreateNavigateHref("contact", { returnTo, clientId }));
  }, [router, returnTo, clientId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchContactsPage(page, pageSize, {
          client: clientId,
          search: search || undefined,
        });
        if (!cancelled) {
          setItems(nextItems);
          setPagination(p);
        }
      } catch {
        if (!cancelled) {
          setLoadError(tContacts("loadError"));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, page, pageSize, search, tContacts, refreshNonce]);

  const pageRange = getListPageRange(pagination);

  function openContactDetail(contactId: number) {
    router.push(
      buildDetailHrefWithListReturn(`${routes.dashboard.contacts}/${contactId}`, clientDetailHref, contactId),
    );
  }

  const addContactButton = (
    <AddButton type="button" onClick={openCreateContact}>
      {t("detail.addContact")}
    </AddButton>
  );

  return (
    <>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ListPageSearchField
            value={search}
            onCommit={commitSearch}
            placeholder={tList("searchPlaceholder")}
            ariaLabel={tList("searchAria")}
            className="max-w-md min-w-0 flex-1"
          />
          {addContactButton}
        </div>

        {loadError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : loading ? (
          <EntityDetailLoadingSkeleton />
        ) : items.length === 0 ? (
          <DashboardEmptyState
            iconName="noResults"
            title={search.trim() ? tList("noResultsTitle") : t("detail.contactsEmptyTitle")}
            description={search.trim() ? tList("noResultsDescription") : t("detail.contactsEmptyDescription")}
            action={search.trim() ? undefined : addContactButton}
          />
        ) : (
          <>
            <EntityDataTable columns={columns} rows={items} onRowClick={(row) => openContactDetail(row.id)} />

            <DataTablePaginationBar
              pagination={pagination}
              summary={tContacts("pageLabel", {
                start: pageRange.start,
                end: pageRange.end,
                total: pagination.total_records,
              })}
              prevLabel={tContacts("prev")}
              nextLabel={tContacts("next")}
              onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
              onNext={() => setPage(pagination.current_page + 1)}
              onPageSelect={(p) => setPage(p)}
              pageSizeControl={{
                label: tList("rowsPerPage"),
                listLabel: tList("rowsPerPage"),
                value: pageSize,
                options: pageSizeOptions,
                onChange: (size) => {
                  setPageSize(size);
                  setPage(1);
                },
                disabled: loading,
              }}
            />
          </>
        )}
      </div>
    </>
  );
}
