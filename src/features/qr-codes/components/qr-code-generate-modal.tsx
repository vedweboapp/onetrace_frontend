"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { generateQrCodes } from "@/features/qr-codes/api/qr-code.api";
import { AppButton, AppModal, FieldLabel, surfaceInputClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { toastSuccess } from "@/shared/feedback/app-toast";

const MIN_COUNT = 1;
const MAX_COUNT = 500;

type Props = {
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
};

export function QrCodeGenerateModal({ open, onClose, onGenerated }: Props) {
  const t = useTranslations("Dashboard.qrCodes");
  const [count, setCount] = React.useState("5");
  const [error, setError] = React.useState<string | undefined>();
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setCount("5");
    setError(undefined);
  }, [open]);

  async function submit() {
    const n = Number.parseInt(count.trim(), 10);
    if (!Number.isFinite(n) || n < MIN_COUNT || n > MAX_COUNT) {
      setError(t("generate.validationCount"));
      return;
    }
    setSaving(true);
    try {
      await generateQrCodes({ number_of_qr_codes: n });
      toastSuccess(t("generate.successToast"));
      onGenerated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title={t("generate.title")}
      titleId="qr-generate-title"
      closeOnBackdrop={!saving}
      isBusy={saving}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            {t("generate.cancel")}
          </AppButton>
          <AppButton type="button" variant="primary" size="sm" loading={saving} onClick={() => void submit()}>
            {t("generate.submit")}
          </AppButton>
        </>
      }
    >
      <div className="space-y-2">
        <FieldLabel htmlFor="qr-generate-count">{t("generate.countLabel")}</FieldLabel>
        <input
          id="qr-generate-count"
          type="number"
          min={MIN_COUNT}
          max={MAX_COUNT}
          value={count}
          onChange={(e) => {
            setCount(e.target.value);
            if (error) setError(undefined);
          }}
          className={cn(surfaceInputClassName, "tabular-nums", error && "border-red-500 focus:border-red-500 focus:ring-red-500/20")}
          autoComplete="off"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("generate.countHint", { min: MIN_COUNT, max: MAX_COUNT })}</p>
        {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      </div>
    </AppModal>
  );
}
