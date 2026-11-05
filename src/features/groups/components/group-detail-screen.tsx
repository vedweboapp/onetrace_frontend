"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deleteGroup, fetchGroup, updateGroupAttachments } from "@/features/groups/api/group.api";
import { GROUP_PATHS } from "@/features/groups/api/group.paths";
import { GroupDetailBody } from "@/features/groups/components/group-detail-body";
import type { Group } from "@/features/groups/types/group.types";
import { EntityAttachmentsTab } from "@/shared/attachments/entity-attachments-tab";
import { EntityNotesTab } from "@/shared/notes/entity-notes-tab";
import {
  EntityDetailDeleteEditActions,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { useTabOrderStorageKey } from "@/shared/hooks/use-tab-order-storage-key";
import { ConfirmDialog, CustomizableAppTabs, type AppTabItem } from "@/shared/ui";

type Props = {
  groupId: number;
};

export function GroupDetailScreen({ groupId }: Props) {
  const t = useTranslations("Dashboard.groups");
  const tCommon = useTranslations("Dashboard.common");
  const tAudit = useTranslations("Dashboard.auditTrails");
  const router = useRouter();
  const tabsStorageKey = useTabOrderStorageKey("groupDetail");
  const [activeTab, setActiveTab] = React.useState("details");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [detailForDelete, setDetailForDelete] = React.useState<Group | null>(null);

  async function confirmDelete() {
    if (!detailForDelete) return;
    setDeleting(true);
    try {
      await deleteGroup(detailForDelete.id);
      toastSuccess(t("deletedToast"));
      router.push(routes.dashboard.groups);
    } catch (error) {
      toastApiError(error, t("loadError"));
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
      entityId={groupId}
      listSection="groups"
      listRoute={routes.dashboard.groups}
      loadError={t("detailLoadError")}
      fetch={fetchGroup}
      getTitle={(detail) => detail.name}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      headerExtension={
        <CustomizableAppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={setActiveTab}
          storageKey={tabsStorageKey}
          ariaLabel={t("detail.backAria")}
          panelIdPrefix="group-detail-tab"
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
          fallbackRoute={routes.dashboard.groups}
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
            emptyIconName="groups"
            updateAttachments={(refs) => updateGroupAttachments(detail.id, refs)}
            onSaved={retry}
          />
        ) : activeTab === "notes" ? (
          <EntityNotesTab detailPath={GROUP_PATHS.detail(detail.id)} />
        ) : (
          <GroupDetailBody detail={detail} dateFmt={dateFmt} onSaved={retry} />
        )
      }
    </EntityDetailScreen>
  );
}
