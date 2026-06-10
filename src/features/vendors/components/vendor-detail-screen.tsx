"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deleteVendor, fetchVendor } from "@/features/vendors/api/vendor.api";
import { VendorDetailBody } from "@/features/vendors/components/vendor-detail-body";
import type { Vendor } from "@/features/vendors/types/vendor.types";
import {
  EntityDetailDeleteEditActions,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { ConfirmDialog } from "@/shared/ui";

type Props = {
  vendorId: number;
};

export function VendorDetailScreen({ vendorId }: Props) {
  const t = useTranslations("Dashboard.vendors");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [detailForDelete, setDetailForDelete] = React.useState<Vendor | null>(null);

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
    >
      {({ detail, dateFmt }) => <VendorDetailBody detail={detail} dateFmt={dateFmt} />}
    </EntityDetailScreen>
  );
}
