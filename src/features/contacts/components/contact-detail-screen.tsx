"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { EntityAuditTimeline } from "@/features/audit-trails/components/entity-audit-timeline";
import { AUDIT_TRAIL_MODULES } from "@/features/audit-trails/constants/audit-trail-modules";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContact, updateContact } from "@/features/contacts/api/contact.api";
import { ContactDetailBody } from "@/features/contacts/components/contact-detail-body";
import type { Contact } from "@/features/contacts/types/contact.types";
import {
  contactClientName,
  contactVendorName,
  getContactType,
} from "@/features/contacts/utils/contact-nested-fields.util";
import { formatContactName } from "@/features/contacts/utils/contact-name.util";
import { fetchVendorsPage } from "@/features/vendors/api/vendor.api";
import {
  EntityDetailEditButton,
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { entityDetailTabPanelClassName } from "@/shared/components/layout/detail-tab-layout";
import { routes } from "@/shared/config/routes";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { buildCurrentPageBackHref, mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";
import { AppButton, AppTabs, type AppTabItem } from "@/shared/ui";

type Props = {
  contactId: number;
};

export function ContactDetailScreen({ contactId }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const tAudit = useTranslations("Dashboard.auditTrails");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [clientNames, setClientNames] = React.useState<Record<number, string>>({});
  const [vendorNames, setVendorNames] = React.useState<Record<number, string>>({});
  const [togglingActive, setTogglingActive] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("details");

  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "details", label: tAudit("tabDetails") },
      { id: "timeline", label: tAudit("tabTimeline") },
    ],
    [tAudit],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ items: clients }, { items: vendors }] = await Promise.all([
          fetchClientsPage(1, 20, { dropdown: true }),
          fetchVendorsPage(1, 20, { dropdown: true }),
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

  const contactTypeOptions = React.useMemo(
    () => [
      { value: "client", label: t("tabs.client") },
      { value: "vendor", label: t("tabs.vendor") },
    ],
    [t],
  );

  const clientOptions = React.useMemo(
    () => Object.entries(clientNames).map(([id, name]) => ({ value: id, label: name })),
    [clientNames],
  );

  const vendorOptions = React.useMemo(
    () => Object.entries(vendorNames).map(([id, name]) => ({ value: id, label: name })),
    [vendorNames],
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
      getTitle={(detail) => formatContactName(detail) || `#${detail.id}`}
      onDetailChange={syncContactTypeInUrl}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      headerExtension={
        <AppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={setActiveTab}
          ariaLabel={tAudit("tabTimeline")}
          panelIdPrefix="contact-detail-tab"
          className="-mx-1 px-1 sm:-mx-0 sm:px-0"
        />
      }
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
      renderSurface={({ detail, loading, error, retry, dateFmt }) => (
        <div
          role="tabpanel"
          id={`contact-detail-tab-${activeTab}`}
          aria-labelledby={`contact-detail-tab-trigger-${activeTab}`}
          className={entityDetailTabPanelClassName}
        >
          {loading ? (
            <EntityDetailLoadingSkeleton />
          ) : error ? (
            <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />
          ) : detail && activeTab === "details" ? (
            (() => {
              const { clientName, vendorName } = resolveParentNames(detail);
              return (
                <ContactDetailBody
                  detail={detail}
                  clientName={clientName}
                  vendorName={vendorName}
                  clientOptions={clientOptions}
                  vendorOptions={vendorOptions}
                  contactTypeOptions={contactTypeOptions}
                  dateFmt={dateFmt}
                  onSaved={retry}
                />
              );
            })()
          ) : detail && activeTab === "timeline" ? (
            <EntityAuditTimeline
              module={AUDIT_TRAIL_MODULES.contact}
              objectId={detail.id}
              dateFmt={dateFmt}
            />
          ) : null}
        </div>
      )}
    />
  );
}
