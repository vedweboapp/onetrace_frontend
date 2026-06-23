"use client";

import * as React from "react";
import { Power, PowerOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { EntityContactsTab } from "@/features/contacts/components/entity-contacts-tab";
import { deleteVendor, fetchVendor, updateVendor } from "@/features/vendors/api/vendor.api";
import { VendorDetailBody } from "@/features/vendors/components/vendor-detail-body";
import type { Vendor } from "@/features/vendors/types/vendor.types";
import {
  EntityDetailDeleteEditActions,
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppTabs, ConfirmDialog, type AppTabItem } from "@/shared/ui";

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
  const [togglingActive, setTogglingActive] = React.useState(false);

  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "details", label: t("detail.tabs.details") },
      { id: "contacts", label: t("detail.tabs.contacts") },
    ],
    [t],
  );

  const allowedDetailTabIds = React.useMemo(() => new Set(detailTabs.map((x) => x.id)), [detailTabs]);

  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = React.useState(() =>
    tabFromUrl && ["details", "contacts"].includes(tabFromUrl) ? tabFromUrl : "details",
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
    } catch {
      toastError(t("loadError"));
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
      actions={({ detail, listBack, retry }) => (
        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            loading={togglingActive}
            disabled={togglingActive}
            onClick={async () => {
              const next = !detail.is_active;
              setTogglingActive(true);
              try {
                await updateVendor(detail.id, { is_active: next });
                toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
                retry();
              } catch {
                toastError(t("toggleActiveError"));
              } finally {
                setTogglingActive(false);
              }
            }}
          >
            {detail.is_active ? (
              <PowerOff className="size-4" aria-hidden />
            ) : (
              <Power className="size-4" aria-hidden />
            )}
            {detail.is_active ? t("deactivate") : t("activate")}
          </AppButton>
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
        </div>
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
        >
          {loading && activeTab === "details" ? (
            <EntityDetailLoadingSkeleton />
          ) : error && activeTab === "details" ? (
            <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />
          ) : detail && activeTab === "details" ? (
            <VendorDetailBody detail={detail} dateFmt={dateFmt} />
          ) : loading ? (
            <EntityDetailLoadingSkeleton />
          ) : error ? (
            <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />
          ) : detail && activeTab === "contacts" ? (
            <EntityContactsTab entityType="vendor" entityId={detail.id} />
          ) : null}
        </div>
      )}
    />
  );
}
