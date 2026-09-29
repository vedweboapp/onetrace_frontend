"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { generateQrCodes } from "@/features/qr-codes/api/qr-code.api";
import type { QrCodeGenerateResult } from "@/features/qr-codes/types/qr-code.types";
import { AppButton, AppModal, FieldErrorText, FieldGroup, surfaceInputClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { toastSuccess } from "@/shared/feedback/app-toast";

const MIN_COUNT = 1;
const MAX_COUNT = 50_000;

type Props = {
  open: boolean;
  onClose: () => void;
  onGenerated: (result: QrCodeGenerateResult) => void;
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
      const result = await generateQrCodes({ number_of_qr_codes: n });
      toastSuccess(result.message ?? t("generate.successToast"));
      onGenerated(result);
      onClose();
    } catch {
      // API/toast layer already surfaces the error
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
      size="sm"
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
      <FieldGroup label={t("generate.countLabel")} htmlFor="qr-generate-count" required>
        <input
          id="qr-generate-count"
          type="number"
          min={MIN_COUNT}
          max={MAX_COUNT}
          value={count}
          onChange={(e) => {
            const raw = e.target.value;
            if (error) setError(undefined);
            if (raw === "") {
              setCount("");
              return;
            }
            const n = Number.parseInt(raw, 10);
            if (!Number.isFinite(n)) return;
            setCount(String(Math.min(MAX_COUNT, Math.max(0, n))));
          }}
          className={cn(
            surfaceInputClassName,
            "w-full max-w-[10rem] tabular-nums",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          )}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
        />
        <FieldErrorText>{error}</FieldErrorText>
      </FieldGroup>
    </AppModal>
  );
}
