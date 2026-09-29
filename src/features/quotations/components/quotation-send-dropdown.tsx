"use client";

import * as React from "react";
import { Building2, UserCheck } from "lucide-react";
import { sendQuotation } from "@/features/quotations/api/quotation.api";
import { QuotationSendVendorsModal } from "@/features/quotations/components/quotation-send-vendors-modal";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailActionMenuDropdown } from "@/shared/ui/detail-action-menu-dropdown";

type Props = {
  quotationId: number;
  quoteName?: string;
  onSent?: () => void;
};

export function QuotationSendDropdown({ quotationId, quoteName, onSent }: Props) {
  const [vendorsModalOpen, setVendorsModalOpen] = React.useState(false);

  const items = React.useMemo(
    () => [
      {
        id: "client",
        label: "Send to Client",
        icon: UserCheck,
        onSelect: async () => {
          try {
            await sendQuotation(quotationId, { notification_send_to: "client" });
            toastSuccess("Quotation sent to client successfully");
            onSent?.();
          } catch (error) {
            toastApiError(error, "Failed to send quotation to client");
          }
        },
      },
      {
        id: "vendors",
        label: "Send to Vendors",
        icon: Building2,
        onSelect: () => {
          setVendorsModalOpen(true);
        },
      },
    ],
    [quotationId, onSent],
  );

  return (
    <>
      <DetailActionMenuDropdown
        buttonLabel="Send Quotation"
        buttonAriaLabel="Send quotation options"
        menuAriaLabel="Send quotation menu"
        loadingLabel="Sending..."
        items={items}
      />
      <QuotationSendVendorsModal
        open={vendorsModalOpen}
        quotationId={quotationId}
        quoteName={quoteName}
        onClose={() => setVendorsModalOpen(false)}
        onSuccess={onSent}
      />
    </>
  );
}
