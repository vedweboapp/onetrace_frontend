"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContact } from "@/features/contacts/api/contact.api";
import { ContactDetailBody } from "@/features/contacts/components/contact-detail-body";
import type { Contact } from "@/features/contacts/types/contact.types";
import {
  contactClientName,
  contactVendorName,
  getContactType,
} from "@/features/contacts/utils/contact-nested-fields.util";
import { fetchVendorsPage } from "@/features/vendors/api/vendor.api";
import {
  EntityDetailEditButton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";

type Props = {
  contactId: number;
};

export function ContactDetailScreen({ contactId }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const [clientNames, setClientNames] = React.useState<Record<number, string>>({});
  const [vendorNames, setVendorNames] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ items: clients }, { items: vendors }] = await Promise.all([
          fetchClientsPage(1, 500),
          fetchVendorsPage(1, 500),
        ]);
        if (!cancelled) {
          const clientMapped: Record<number, string> = {};
          for (const row of clients) clientMapped[row.id] = row.name;
          const vendorMapped: Record<number, string> = {};
          for (const row of vendors) vendorMapped[row.id] = row.name;
          setClientNames(clientMapped);
          setVendorNames(vendorMapped);
        }
      } catch {
        if (!cancelled) {
          setClientNames({});
          setVendorNames({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function resolveParentNames(detail: Contact) {
    const type = getContactType(detail);
    return {
      clientName: contactClientName(detail, clientNames),
      vendorName: contactVendorName(detail, vendorNames),
      contactType: type,
    };
  }

  return (
    <EntityDetailScreen
      entityId={contactId}
      listSection="contacts"
      listRoute={routes.dashboard.contacts}
      loadError={t("detailLoadError")}
      fetch={fetchContact}
      getTitle={(detail) => detail.name}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      actions={({ listBack }) => (
        <EntityDetailEditButton
          label={t("edit")}
          listBack={listBack}
          fallbackRoute={routes.dashboard.contacts}
        />
      )}
    >
      {({ detail, dateFmt }) => {
        const { clientName, vendorName } = resolveParentNames(detail);
        return (
          <ContactDetailBody
            detail={detail}
            clientName={clientName}
            vendorName={vendorName}
            dateFmt={dateFmt}
          />
        );
      }}
    </EntityDetailScreen>
  );
}
