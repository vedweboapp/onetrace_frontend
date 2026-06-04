"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContact } from "@/features/contacts/api/contact.api";
import { ContactDetailBody } from "@/features/contacts/components/contact-detail-body";
import type { Contact } from "@/features/contacts/types/contact.types";
import {
  EntityDetailEditButton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";

function contactClientId(detail: Contact): number | null {
  if (typeof detail.client === "number" && Number.isFinite(detail.client) && detail.client > 0) return detail.client;
  if (detail.client && typeof detail.client === "object" && Number.isFinite(detail.client.id) && detail.client.id > 0) {
    return detail.client.id;
  }
  return null;
}

function contactClientName(detail: Contact, clientNames: Record<number, string>): string {
  if (detail.client && typeof detail.client === "object" && detail.client.name?.trim()) return detail.client.name.trim();
  const id = contactClientId(detail);
  if (id && clientNames[id]) return clientNames[id];
  return id ? `#${id}` : "—";
}

type Props = {
  contactId: number;
};

export function ContactDetailScreen({ contactId }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const [clientNames, setClientNames] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchClientsPage(1, 500);
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of items) mapped[row.id] = row.name;
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
      {({ detail, dateFmt }) => (
        <ContactDetailBody
          detail={detail}
          clientName={contactClientName(detail, clientNames)}
          dateFmt={dateFmt}
        />
      )}
    </EntityDetailScreen>
  );
}
