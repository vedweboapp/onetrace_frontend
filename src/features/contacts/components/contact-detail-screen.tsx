"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContact, updateContact } from "@/features/contacts/api/contact.api";
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
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { buildCurrentPageBackHref, mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";
import { AppButton } from "@/shared/ui";

type Props = {
  contactId: number;
};

export function ContactDetailScreen({ contactId }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [clientNames, setClientNames] = React.useState<Record<number, string>>({});
  const [vendorNames, setVendorNames] = React.useState<Record<number, string>>({});
  const [togglingActive, setTogglingActive] = React.useState(false);

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

  const syncContactTypeInUrl = React.useCallback(
    (detail: Contact | null) => {
      if (!detail) return;
      const type = getContactType(detail);
      const current = (searchParams.get("contact_type") ?? "").toLowerCase();
      if (current === type) return;
      // Client is the default nav state when param is missing; only force when vendor (or mismatched).
      if (!current && type === "client") return;
      router.replace(
        mergeUrlQueryParam(buildCurrentPageBackHref(pathname, searchParams), "contact_type", type),
        { scroll: false },
      );
    },
    [pathname, router, searchParams],
  );

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
      onDetailChange={syncContactTypeInUrl}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      actions={({ detail, listBack, retry }) => (
        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            loading={togglingActive}
            disabled={togglingActive}
            onClick={async () => {
              const next = !detail.is_active;
              setTogglingActive(true);
              try {
                await updateContact(detail.id, { is_active: next });
                toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
                retry();
              } catch (error) {
                toastApiError(error, t("toggleActiveError"));
              } finally {
                setTogglingActive(false);
              }
            }}
          >
            {detail.is_active ? t("deactivate") : t("activate")}
          </AppButton>
          <EntityDetailEditButton
            label={t("edit")}
            listBack={listBack}
            fallbackRoute={routes.dashboard.contacts}
          />
        </div>
      )}
      renderSurface={({ detail, loading, error, retry, dateFmt }) => {
        if (loading) return <EntityDetailLoadingSkeleton />;
        if (error) {
          return <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />;
        }
        if (!detail) return null;
        const { clientName, vendorName } = resolveParentNames(detail);
        return (
          <ContactDetailBody
            detail={detail}
            clientName={clientName}
            vendorName={vendorName}
            dateFmt={dateFmt}
            onSaved={retry}
          />
        );
      }}
    />
  );
}
