"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  QUOTATION_STATUS_OPTIONS,
  normalizeQuotationStatusValue,
} from "@/features/quotations/utils/quotation-status.util";
import { AppButton, AppModal, CheckmarkSelect } from "@/shared/ui";

type Props = {
  open: boolean;
  currentStatus: string | null | undefined;
  quoteName: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: (status: string) => void;
};

export function QuotationUpdateStatusDialog({
  open,
  currentStatus,
  quoteName,
  saving,
  onClose,
  onConfirm,
}: Props) {
  const t = useTranslations("Dashboard.quotations");
  const [selected, setSelected] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setSelected(normalizeQuotationStatusValue(currentStatus));
  }, [open, currentStatus]);

  const options = React.useMemo(
    () =>
      QUOTATION_STATUS_OPTIONS.map((row) => ({
        value: row.value,
        label: t(row.labelKey),
      })),
    [t],
  );

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
  }

  return (
    <AppModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title={t("updateStatus.title")}
      size="md"
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            {t("modal.cancel")}
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            loading={saving}
            disabled={!selected || saving}
            onClick={handleConfirm}
          >
            {t("updateStatus.confirm")}
          </AppButton>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {t("updateStatus.body", { title: quoteName })}
      </p>
      <CheckmarkSelect
        id="quotation-status-select"
        label={t("table.status")}
        options={options}
        value={selected}
        onChange={setSelected}
        emptyLabel={t("updateStatus.placeholder")}
        disabled={saving}
        listLabel={t("table.status")}
        portaled
      />
    </AppModal>
  );
}
