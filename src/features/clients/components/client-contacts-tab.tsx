"use client";

import { EntityContactsTab } from "@/features/contacts/components/entity-contacts-tab";

type Props = {
  clientId: number;
};

export function ClientContactsTab({ clientId }: Props) {
  return <EntityContactsTab entityType="client" entityId={clientId} />;
}
