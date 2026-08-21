"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import type { Contact, ContactType } from "@/features/contacts/types/contact.types";
import { EntityDataTable, EntityDetailTabLoadingState, entityCol } from "@/shared/components/entity";
import { DetailTabListShell, DetailTabTableBody } from "@/shared/components/layout/detail-tab-list-shell";
import { detailTabToolbarClassName } from "@/shared/components/layout/detail-tab-layout";
import { cn } from "@/core/utils/http.util";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { buildDetailHrefWithListReturn, buildEntityDetailTabBackHref, mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";
import { buildQuickCreateNavigateHref } from "@/shared/utils/quick-create-navigation.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { AddButton, DataTablePaginationBar, ListPageEmptyStates } from "@/shared/ui";

type Props = {
  entityType: ContactType;
  entityId: number;
};

export function EntityContactsTab({ entityType, entityId }: Props) {
  const tClients = useTranslations("Dashboard.clients");
  const tVendors = useTranslations("Dashboard.vendors");
  const t = entityType === "vendor" ? tVendors : tClients;
  const tContacts = useTranslations("Dashboard.contacts");
  const tList = useTranslations("Dashboard.list");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateFmt = useDashboardDateFormat();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
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

  const returnTo = React.useMemo(
    () => buildEntityDetailTabBackHref(pathname, "contacts", searchParams),
    [pathname, searchParams],
  );

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

  const reloadList = React.useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  useQuickCreateReturn({
    onApplySelect: () => reloadList(),
  });

  const openCreateContact = React.useCallback(() => {
    router.push(
      buildQuickCreateNavigateHref("contact", {
        returnTo,
        contactType: entityType,
        clientId: entityType === "client" ? entityId : undefined,
        vendorId: entityType === "vendor" ? entityId : undefined,
      }),
    );
  }, [router, returnTo, entityType, entityId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const filters =
          entityType === "vendor"
            ? { vendor: entityId, contact_type: "vendor" as const }
            : { client: entityId, contact_type: "client" as const };
        const { items: nextItems, pagination: p } = await fetchContactsPage(page, pageSize, filters);
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
  }, [entityType, entityId, page, pageSize, tContacts, refreshNonce]);

  const pageRange = getListPageRange(pagination);

  function openContactDetail(contactId: number) {
    const detailPath = mergeUrlQueryParam(
      `${routes.dashboard.contacts}/${contactId}`,
      "contact_type",
      entityType,
    );
    router.push(buildDetailHrefWithListReturn(detailPath, returnTo, contactId));
  }

  const addContactButton = (
    <AddButton type="button" onClick={openCreateContact}>
      {t("detail.addContact")}
    </AddButton>
  );

  const emptyStateKind = React.useMemo(() => {
    if (loading || loadError || items.length > 0) return "none" as const;
    return "onboarding" as const;
  }, [loading, loadError, items.length]);

  return (
    <DetailTabListShell
      loading={loading}
      loadError={loadError}
      isEmpty={items.length === 0}
      toolbar={
        !loading && !loadError && items.length > 0 ? (
          <div className={cn(detailTabToolbarClassName, "justify-end")}>{addContactButton}</div>
        ) : null
      }
      loadingFallback={<EntityDetailTabLoadingState />}
      emptyFallback={
        <ListPageEmptyStates
          fill
          emptyStateKind={emptyStateKind}
          onboarding={{
            iconName: "clients",
            title: t("detail.contactsEmptyTitle"),
            description: t("detail.contactsEmptyDescription"),
            action: addContactButton,
          }}
          onClearFilters={() => {}}
        />
      }
    >
      <DetailTabTableBody>
        <EntityDataTable
          columns={columns}
          rows={items}
          minBodyRows={pageSize}
          onRowClick={(row) => openContactDetail(row.id)}
        />
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
      </DetailTabTableBody>
    </DetailTabListShell>
  );
}
