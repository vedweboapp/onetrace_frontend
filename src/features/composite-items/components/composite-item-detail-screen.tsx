"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  deleteCompositeItem,
  fetchCompositeItem,
} from "@/features/composite-items/api/composite-item.api";
import { updateItemAttachments } from "@/features/items/api/item.api";
import { ITEM_PATHS } from "@/features/items/api/item.paths";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { ItemDetailBody } from "@/features/items/components/item-detail-body";
import { EntityAttachmentsTab } from "@/shared/attachments/entity-attachments-tab";
import { EntityNotesTab } from "@/shared/notes/entity-notes-tab";
import {
  EntityDetailDeleteEditActions,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { useTabOrderStorageKey } from "@/shared/hooks/use-tab-order-storage-key";
import { ConfirmDialog, CustomizableAppTabs, type AppTabItem } from "@/shared/ui";

type Props = {
  itemId: number;
};

export function CompositeItemDetailScreen({ itemId }: Props) {
  const t = useTranslations("Dashboard.compositeItems");
  const tItems = useTranslations("Dashboard.items");
  const tCommon = useTranslations("Dashboard.common");
  const tAudit = useTranslations("Dashboard.auditTrails");
  const router = useRouter();
  const tabsStorageKey = useTabOrderStorageKey("compositeItemDetail");
  const [activeTab, setActiveTab] = React.useState("details");
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

  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "details", label: tAudit("tabDetails") },
      { id: "attachments", label: tCommon("attachmentsTab.title") },
      { id: "notes", label: tCommon("notesTab.title") },
    ],
    [tAudit, tCommon],
  );

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
      headerExtension={
        <CustomizableAppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={setActiveTab}
          storageKey={tabsStorageKey}
          ariaLabel={t("detail.backAria")}
          panelIdPrefix="composite-item-detail-tab"
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
      {({ detail, dateFmt, retry }) =>
        activeTab === "attachments" ? (
          <EntityAttachmentsTab
            entityId={detail.id}
            attachments={detail.attachments}
            emptyIconName="compositeItems"
            updateAttachments={(refs) => updateItemAttachments(detail.id, refs)}
            onSaved={retry}
          />
        ) : activeTab === "notes" ? (
          <EntityNotesTab detailPath={ITEM_PATHS.detail(detail.id)} />
        ) : (
          <ItemDetailBody detail={detail} dateFmt={dateFmt} onSaved={retry} />
        )
      }
    </EntityDetailScreen>
  );
}
