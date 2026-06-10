"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import { fetchInvoice, previewInvoicePdf, sendInvoice } from "@/features/invoices/api/invoice.api";
import { InvoiceDetailBody } from "@/features/invoices/components/invoice-detail-body";
import { InvoiceExportDropdown } from "@/features/invoices/components/invoice-export-dropdown";
import type { InvoiceContactRef, InvoiceDetail } from "@/features/invoices/types/invoice.types";
import { nestedId, normalizeInvoiceStatus } from "@/features/invoices/utils/invoice-nested-fields.util";
import { EntityDetailEditButton, EntityDetailScreen } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppTabs } from "@/shared/ui";

type Props = {
  invoiceId: number;
};

export function InvoiceDetailScreen({ invoiceId }: Props) {
  const t = useTranslations("Dashboard.invoices");
  const dueFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const [activeTab, setActiveTab] = React.useState<"overview" | "lineItems">("overview");
  const [previewing, setPreviewing] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [clientNames, setClientNames] = React.useState<Record<number, string>>({});
  const [contactNames, setContactNames] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: clients } = await fetchClientsPage(1, 500, { is_active: true }, { silent: true });
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of clients) mapped[row.id] = row.name;
          setClientNames(mapped);
        }
      } catch {
        if (!cancelled) setClientNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: contacts } = await fetchContactsPage(1, 500, { is_active: true });
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of contacts) {
            const label = row.name?.trim() || row.email?.trim();
            if (label) mapped[row.id] = label;
          }
          setContactNames(mapped);
        }
      } catch {
        if (!cancelled) setContactNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabel = React.useCallback(
    (code: string | null | undefined) => {
      const norm = normalizeInvoiceStatus(code);
      if (norm === "draft") return t("status.draft");
      if (norm === "sent") return t("status.sent");
      if (norm === "paid") return t("status.paid");
      if (norm === "pending") return t("status.pending");
      if (norm === "overdue") return t("status.overdue");
      return code?.trim() || "—";
    },
    [t],
  );

  const detailTabs = React.useMemo(
    () => [
      { id: "overview", label: t("tabs.overview") },
      { id: "lineItems", label: t("tabs.lineItems") },
    ],
    [t],
  );

  return (
    <EntityDetailScreen<InvoiceDetail>
      entityId={invoiceId}
      listSection="invoices"
      listRoute={routes.dashboard.invoices}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      loadError={t("detailLoadError")}
      fetch={fetchInvoice}
      getTitle={(detail) => detail.invoice_number}
      headerExtension={
        <AppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={(id) => setActiveTab(id as "overview" | "lineItems")}
        />
      }
      actions={({ detail, listBack }) => (
        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            loading={previewing}
            onClick={async () => {
              setPreviewing(true);
              try {
                await previewInvoicePdf(detail.id);
              } catch {
                toastError(t("export.failed"));
              } finally {
                setPreviewing(false);
              }
            }}
          >
            {t("actions.preview")}
          </AppButton>
          <InvoiceExportDropdown invoiceId={detail.id} invoiceNumber={detail.invoice_number} />
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            loading={sending}
            onClick={async () => {
              setSending(true);
              try {
                await sendInvoice(detail.id);
                toastSuccess(t("send.success"));
              } catch {
                toastError(t("send.failed"));
              } finally {
                setSending(false);
              }
            }}
          >
            {t("actions.send")}
          </AppButton>
          <EntityDetailEditButton listBack={listBack} fallbackRoute={routes.dashboard.invoices} label={t("edit")} />
        </div>
      )}
    >
      {({ detail, dateFmt }) => {
        const clientId = nestedId(detail.client);
        const contactRef = (detail.contact ?? detail.contact_person) as
          | number
          | InvoiceContactRef
          | null
          | undefined;
        const contactId = nestedId(contactRef);
        return (
          <InvoiceDetailBody
            detail={detail}
            clientName={clientId != null ? clientNames[clientId] : undefined}
            contactName={contactId != null ? contactNames[contactId] : undefined}
            dateFmt={dateFmt}
            dueFmt={dueFmt}
            statusLabel={statusLabel(detail.status)}
            activeTab={activeTab}
          />
        );
      }}
    </EntityDetailScreen>
  );
}
