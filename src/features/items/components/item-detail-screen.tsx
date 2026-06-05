"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deleteItem, fetchItem } from "@/features/items/api/item.api";
import { ItemDetailBody } from "@/features/items/components/item-detail-body";
import type { Item } from "@/features/items/types/item.types";
import {
  EntityDetailDeleteEditActions,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { ConfirmDialog } from "@/shared/ui";

type Props = {
  itemId: number;
};

export function ItemDetailScreen({ itemId }: Props) {
  const t = useTranslations("Dashboard.items");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [detailForDelete, setDetailForDelete] = React.useState<Item | null>(null);

  async function confirmDelete() {
    if (!detailForDelete) return;
    setDeleting(true);
    try {
      await deleteItem(detailForDelete.id);
      toastSuccess(t("deletedToast"));
      router.push(routes.dashboard.items);
    } catch {
      toastError(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <EntityDetailScreen
      entityId={itemId}
      listSection="items"
      listRoute={routes.dashboard.items}
      loadError={t("loadError")}
      fetch={fetchItem}
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
          fallbackRoute={routes.dashboard.items}
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
          cancelLabel={t("cancel")}
          isBusy={deleting}
        />
      }
    >
      {({ detail, dateFmt }) => <ItemDetailBody detail={detail} dateFmt={dateFmt} />}
    </EntityDetailScreen>
  );
}
