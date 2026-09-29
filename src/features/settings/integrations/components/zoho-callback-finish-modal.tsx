"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { completeZohoIntegration } from "@/features/settings/integrations/api/integration.api";
import { getApiErrorDisplayMessage, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal } from "@/shared/ui";

export type ZohoCallbackFinishModalProps = {
  open: boolean;
  code: string;
  state: string;
  accountsServer: string;
  onCancel: () => void;
  onSuccess: () => void;
};

export function ZohoCallbackFinishModal({
  open,
  code,
  state,
  accountsServer,
  onCancel,
  onSuccess,
}: ZohoCallbackFinishModalProps) {
  const t = useTranslations("Dashboard.integrations.zohoCallback");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const missingParams = !code || !state || !accountsServer;

  React.useEffect(() => {
    if (!open) {
      setErrorMessage(null);
      setSubmitting(false);
    }
  }, [open]);

  async function handleFinish() {
    if (missingParams) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const message = await completeZohoIntegration({
        code,
        state,
        accountsServer,
        pullHistoricalData: true,
      });
      toastSuccess(message);
      onSuccess();
    } catch (error) {
      setErrorMessage(getApiErrorDisplayMessage(error, t("connectionFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onCancel}
      title={missingParams ? undefined : t("title")}
      description={missingParams ? undefined : t("description")}
      size="md"
      closeOnBackdrop={!submitting}
      isBusy={submitting}
      showCloseButton={!submitting}
      footer={
        missingParams ? (
          <div className="flex justify-end">
            <AppButton type="button" variant="secondary" size="sm" onClick={onCancel}>
              {t("cancel")}
            </AppButton>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={submitting}
              onClick={onCancel}
            >
              {t("cancel")}
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              loading={submitting}
              onClick={() => void handleFinish()}
            >
              {t("finish")}
            </AppButton>
          </div>
        )
      }
    >
      {missingParams ? (
        <p className="text-sm text-red-600 dark:text-red-400">{t("missingParams")}</p>
      ) : errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </AppModal>
  );
}
