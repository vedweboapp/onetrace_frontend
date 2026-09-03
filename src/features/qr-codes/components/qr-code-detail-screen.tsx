"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deleteQrCode, fetchQrCode } from "@/features/qr-codes/api/qr-code.api";
import { QrCodeDetailBody } from "@/features/qr-codes/components/qr-code-detail-body";
import { EntityDetailScreen } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { AppButton, ConfirmDialog } from "@/shared/ui";
import { toastSuccess } from "@/shared/feedback/app-toast";

type Props = {
  qrCodeId: number;
};

export function QrCodeDetailScreen({ qrCodeId }: Props) {
  const t = useTranslations("Dashboard.qrCodes");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [titleLabel, setTitleLabel] = React.useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteQrCode(qrCodeId);
      toastSuccess(t("deletedToast"));
      router.push(routes.dashboard.qrCodes);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <EntityDetailScreen
        entityId={qrCodeId}
        listSection="qr-codes"
        listRoute={routes.dashboard.qrCodes}
        loadError={t("detailLoadError")}
        fetch={fetchQrCode}
        getTitle={(detail) => detail.qr_code_id}
        onDetailChange={(detail) => setTitleLabel(detail?.qr_code_id ?? null)}
        labels={{
          metaTitle: t("detailMetaTitle"),
          backAria: t("detail.backAria"),
          retry: t("detail.retry"),
        }}
        actions={() => (
          <AppButton type="button" variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" aria-hidden />
            {t("delete")}
          </AppButton>
        )}
      >
        {({ detail, dateFmt }) => <QrCodeDetailBody detail={detail} dateFmt={dateFmt} />}
      </EntityDetailScreen>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={titleLabel ?? undefined}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("generate.cancel")}
        isBusy={deleting}
      />
    </>
  );
}
