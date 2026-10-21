"use client";

import * as React from "react";
import { Building2, UserCheck } from "lucide-react";
import { QuotationSendVendorsModal } from "@/features/quotations/components/quotation-send-vendors-modal";
import { QuotationSendClientModal } from "@/features/quotations/components/quotation-send-client-modal";
import { DetailActionMenuDropdown } from "@/shared/ui/detail-action-menu-dropdown";

type Props = {
  quotationId: number;
  quoteName?: string;
  onSent?: () => void;
};

export function QuotationSendDropdown({ quotationId, quoteName, onSent }: Props) {
  const [vendorsModalOpen, setVendorsModalOpen] = React.useState(false);
  const [clientModalOpen, setClientModalOpen] = React.useState(false);

  const items = React.useMemo(
    () => [
      {
        id: "client",
        label: "Send to Client",
        icon: UserCheck,
        onSelect: () => {
          setClientModalOpen(true);
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
    [],
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
      <QuotationSendClientModal
        open={clientModalOpen}
        quotationId={quotationId}
        quoteName={quoteName}
        onClose={() => setClientModalOpen(false)}
        onSuccess={onSent}
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
