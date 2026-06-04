"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deleteGroup, fetchGroup } from "@/features/groups/api/group.api";
import { GroupDetailBody } from "@/features/groups/components/group-detail-body";
import type { Group } from "@/features/groups/types/group.types";
import {
  EntityDetailDeleteEditActions,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { ConfirmDialog } from "@/shared/ui";

type Props = {
  groupId: number;
};

export function GroupDetailScreen({ groupId }: Props) {
  const t = useTranslations("Dashboard.groups");
  const router = useRouter();
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
    } catch {
      toastError(t("loadError"));
    } finally {
      setDeleting(false);
    }
  }

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
      {({ detail, dateFmt }) => <GroupDetailBody detail={detail} dateFmt={dateFmt} />}
    </EntityDetailScreen>
  );
}
