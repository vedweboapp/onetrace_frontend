"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { EntityContactsTab } from "@/features/contacts/components/entity-contacts-tab";
import { deleteVendor, fetchVendor } from "@/features/vendors/api/vendor.api";
import { VendorDetailBody } from "@/features/vendors/components/vendor-detail-body";
import { VendorItemsTab } from "@/features/vendors/components/vendor-items-tab";
import type { Vendor } from "@/features/vendors/types/vendor.types";
import {
  EntityDetailDeleteEditActions,
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
  EntityDetailTabLoadingState,
} from "@/shared/components/entity";
import { entityDetailTabPanelClassName } from "@/shared/components/layout/detail-tab-layout";
import { routes } from "@/shared/config/routes";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { AppTabs, ConfirmDialog, type AppTabItem } from "@/shared/ui";

type Props = {
  vendorId: number;
};

export function VendorDetailScreen({ vendorId }: Props) {
  const t = useTranslations("Dashboard.vendors");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [detailForDelete, setDetailForDelete] = React.useState<Vendor | null>(null);

  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "details", label: t("detail.tabs.details") },
      { id: "contacts", label: t("detail.tabs.contacts") },
      { id: "items", label: t("detail.tabs.items") },
    ],
    [t],
  );

  const allowedDetailTabIds = React.useMemo(() => new Set(detailTabs.map((x) => x.id)), [detailTabs]);

  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = React.useState(() =>
    tabFromUrl && allowedDetailTabIds.has(tabFromUrl) ? tabFromUrl : "details",
  );

  React.useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab || !allowedDetailTabIds.has(tab)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTab(tab);
    const p = new URLSearchParams(searchParams.toString());
    p.delete("tab");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, allowedDetailTabIds]);

  async function confirmDelete() {
    if (!detailForDelete) return;
    setDeleting(true);
    try {
      await deleteVendor(detailForDelete.id);
      toastSuccess(t("deletedToast"));
      router.push(routes.dashboard.vendors);
    } catch (error) {
      toastApiError(error, t("loadError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <EntityDetailScreen
      entityId={vendorId}
      listSection="vendors"
      listRoute={routes.dashboard.vendors}
      loadError={t("detailLoadError")}
      fetch={fetchVendor}
      getTitle={(detail) => detail.name}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      headerExtension={
        <AppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={(tab) => {
            setActiveTab(tab);
            const p = new URLSearchParams(searchParams.toString());
            if (tab === "details") p.delete("tab");
            else p.set("tab", tab);
            const qs = p.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
          }}
          ariaLabel={t("detail.tabsAria")}
          panelIdPrefix="vendor-detail-tab"
          className="-mx-1 px-1 sm:-mx-0 sm:px-0"
        />
      }
      actions={({ detail, listBack }) => (
        <EntityDetailDeleteEditActions
          deleteLabel={t("delete")}
          onDelete={() => {
            setDetailForDelete(detail);
            setDeleteOpen(true);
          }}
          label={t("edit")}
          listBack={listBack}
          fallbackRoute={routes.dashboard.vendors}
        />
      )}
      footer={
        <ConfirmDialog
          open={deleteOpen}
          onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
          onConfirm={() => void confirmDelete()}
          title={t("deleteConfirmTitle")}
          body={t("deleteConfirmBody")}
          highlight={detailForDelete?.name}
          confirmLabel={t("confirmDelete")}
          cancelLabel={t("modal.cancel")}
          isBusy={deleting}
        />
      }
      renderSurface={({ detail, loading, error, retry, dateFmt }) => (
        <div
          role="tabpanel"
          id={`vendor-detail-tab-${activeTab}`}
          aria-labelledby={`vendor-detail-tab-trigger-${activeTab}`}
          className={entityDetailTabPanelClassName}
        >
          {loading && activeTab === "details" ? (
            <EntityDetailLoadingSkeleton fill />
          ) : error && activeTab === "details" ? (
            <EntityDetailErrorState fill message={error} retryLabel={t("detail.retry")} onRetry={retry} />
          ) : detail && activeTab === "details" ? (
            <VendorDetailBody detail={detail} dateFmt={dateFmt} onSaved={retry} />
          ) : loading ? (
            <EntityDetailTabLoadingState />
          ) : error ? (
            <EntityDetailErrorState fill message={error} retryLabel={t("detail.retry")} onRetry={retry} />
          ) : detail && activeTab === "contacts" ? (
            <EntityContactsTab entityType="vendor" entityId={detail.id} />
          ) : detail && activeTab === "items" ? (
            <VendorItemsTab vendorId={detail.id} />
          ) : null}
        </div>
      )}
    />
  );
}
