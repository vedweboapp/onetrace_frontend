"use client";

import * as React from "react";
import { FileSpreadsheet, FileStack, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { exportQuotation, type QuotationExportType } from "@/features/quotations/api/quotation.api";
import { toastError } from "@/shared/feedback/app-toast";
import { DetailActionMenuDropdown } from "@/shared/ui/detail-action-menu-dropdown";

type Props = {
  quotationId: number;
  quoteName?: string;
};

export function QuotationExportDropdown({ quotationId, quoteName }: Props) {
  const t = useTranslations("Dashboard.quotations.export");

  const items = React.useMemo(
    () =>
      (
        [
          { id: "pdf" as const, label: t("pdf"), icon: FileText },
          { id: "excel" as const, label: t("excel"), icon: FileSpreadsheet },
          { id: "csv" as const, label: t("csv"), icon: FileStack },
        ] satisfies { id: QuotationExportType; label: string; icon: typeof FileText }[]
      ).map((item) => ({
        ...item,
        onSelect: async () => {
          try {
            await exportQuotation(quotationId, item.id, quoteName);
          } catch (e) {
            const msg = e instanceof Error ? e.message : t("failed");
            toastError(msg);
          }
        },
      })),
    [quotationId, quoteName, t],
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
