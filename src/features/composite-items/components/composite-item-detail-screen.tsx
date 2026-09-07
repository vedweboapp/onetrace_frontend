"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  deleteCompositeItem,
  fetchCompositeItem,
} from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { ItemDetailBody } from "@/features/items/components/item-detail-body";
import {
  EntityDetailDeleteEditActions,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { ConfirmDialog } from "@/shared/ui";

type Props = {
  itemId: number;
};

export function CompositeItemDetailScreen({ itemId }: Props) {
  const t = useTranslations("Dashboard.compositeItems");
  const tItems = useTranslations("Dashboard.items");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [detailForDelete, setDetailForDelete] = React.useState<CompositeItem | null>(null);

  async function confirmDelete() {
    if (!detailForDelete) return;
    setDeleting(true);
    try {
      await deleteCompositeItem(detailForDelete.id);
      toastSuccess(t("deletedToast"));
      router.push(routes.dashboard.compositeItems);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <EntityDetailScreen
      entityId={itemId}
      listSection="composite-items"
      listRoute={routes.dashboard.compositeItems}
      loadError={t("loadError")}
      fetch={fetchCompositeItem}
      getTitle={(detail) => detail.name}
      labels={{
        metaTitle: tItems("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: tItems("detail.retry"),
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
          fallbackRoute={routes.dashboard.compositeItems}
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
      {({ detail, dateFmt, retry }) => (
        <ItemDetailBody detail={detail} dateFmt={dateFmt} onSaved={retry} />
      )}
    </EntityDetailScreen>
  );
}
