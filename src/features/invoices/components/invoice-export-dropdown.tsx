"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { exportInvoicePdf } from "@/features/invoices/api/invoice.api";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailActionMenuDropdown } from "@/shared/ui/detail-action-menu-dropdown";

type Props = {
  invoiceId: number;
  invoiceNumber?: string;
};

export function InvoiceExportDropdown({ invoiceId, invoiceNumber }: Props) {
  const t = useTranslations("Dashboard.invoices.export");

  const items = React.useMemo(
    () => [
      {
        id: "pdf",
        label: t("pdf"),
        icon: FileText,
        onSelect: async () => {
          try {
            await exportInvoicePdf(invoiceId, invoiceNumber);
            toastSuccess(t("success"));
          } catch (e) {
            const msg = e instanceof Error ? e.message : t("failed");
            toastError(msg);
          }
        },
      },
    ],
    [invoiceId, invoiceNumber, t],
  );

  return (
    <DetailActionMenuDropdown
      buttonLabel={t("button")}
      buttonAriaLabel={t("buttonAria")}
      menuAriaLabel={t("menuAria")}
      loadingLabel={t("exporting")}
      items={items}
    />
  );
}
