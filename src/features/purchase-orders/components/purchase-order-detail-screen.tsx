"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { EntityAuditTimeline } from "@/features/audit-trails/components/entity-audit-timeline";
import { AUDIT_TRAIL_MODULES } from "@/features/audit-trails/constants/audit-trail-modules";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import { formatContactName } from "@/features/contacts/utils/contact-name.util";
import { fetchPurchaseOrder } from "@/features/purchase-orders/api/purchase-order.api";
import { PurchaseOrderDetailBody } from "@/features/purchase-orders/components/purchase-order-detail-body";
import type { PurchaseOrderContactRef, PurchaseOrderDetail } from "@/features/purchase-orders/types/purchase-order.types";
import { nestedId, normalizePurchaseOrderStatus } from "@/features/purchase-orders/utils/purchase-order-nested-fields.util";
import { fetchVendorsPage } from "@/features/vendors/api/vendor.api";
import { EntityDetailEditButton, EntityDetailScreen } from "@/shared/components/entity";
import { entityDetailTabPanelClassName } from "@/shared/components/layout/detail-tab-layout";
import { routes } from "@/shared/config/routes";
import { AppTabs } from "@/shared/ui";

type Props = {
  purchaseOrderId: number;
};

export function PurchaseOrderDetailScreen({ purchaseOrderId }: Props) {
  const t = useTranslations("Dashboard.purchaseOrders");
  const tAudit = useTranslations("Dashboard.auditTrails");
  const dueFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const [activeTab, setActiveTab] = React.useState<"overview" | "lineItems" | "timeline">("overview");
  const [vendorNames, setVendorNames] = React.useState<Record<number, string>>({});
  const [contactNames, setContactNames] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: vendors } = await fetchVendorsPage(1, 20, { is_active: true, dropdown: true });
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of vendors) mapped[row.id] = row.name;
          setVendorNames(mapped);
        }
      } catch {
        if (!cancelled) setVendorNames({});
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
        const { items: contacts } = await fetchContactsPage(1, 20, { is_active: true, contact_type: "vendor", dropdown: true });
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of contacts) {
            const label = formatContactName(row);
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
      const norm = normalizePurchaseOrderStatus(code);
      if (norm === "draft") return t("status.draft");
      if (norm === "sent") return t("status.sent");
      if (norm === "approved") return t("status.approved");
      if (norm === "received") return t("status.received");
      if (norm === "cancelled") return t("status.cancelled");
      return code?.trim() || "—";
    },
    [t],
  );

  const detailTabs = React.useMemo(
    () => [
      { id: "overview", label: t("tabs.overview") },
      { id: "lineItems", label: t("tabs.lineItems") },
      { id: "timeline", label: tAudit("tabTimeline") },
    ],
    [t, tAudit],
  );

  return (
    <EntityDetailScreen<PurchaseOrderDetail>
      entityId={purchaseOrderId}
      listSection="purchase-orders"
      listRoute={routes.dashboard.purchaseOrders}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      loadError={t("detailLoadError")}
      fetch={fetchPurchaseOrder}
      getTitle={(detail) => detail.purchase_order_number}
      headerExtension={
        <AppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={(id) => setActiveTab(id as "overview" | "lineItems" | "timeline")}
        />
      }
      actions={({ listBack }) => (
        <EntityDetailEditButton
          listBack={listBack}
          fallbackRoute={routes.dashboard.purchaseOrders}
          label={t("edit")}
        />
      )}
      renderSurface={({ detail, dateFmt, retry }) => {
        if (!detail) return null;
        if (activeTab === "timeline") {
          return (
            <div
              role="tabpanel"
              id={`purchase-order-detail-tab-${activeTab}`}
              aria-labelledby={`purchase-order-detail-tab-trigger-${activeTab}`}
              className={entityDetailTabPanelClassName}
            >
              <EntityAuditTimeline
                module={AUDIT_TRAIL_MODULES.purchaseOrder}
                objectId={detail.id}
                dateFmt={dateFmt}
              />
            </div>
          );
        }
        const vendorId = nestedId(detail.vendor);
        const contactId = nestedId(detail.contact as number | PurchaseOrderContactRef | null | undefined);
        return (
          <div
            role="tabpanel"
            id={`purchase-order-detail-tab-${activeTab}`}
            aria-labelledby={`purchase-order-detail-tab-trigger-${activeTab}`}
            className={entityDetailTabPanelClassName}
          >
            <PurchaseOrderDetailBody
              detail={detail}
              vendorName={vendorId != null ? vendorNames[vendorId] : undefined}
              contactName={contactId != null ? contactNames[contactId] : undefined}
              dateFmt={dateFmt}
              dueFmt={dueFmt}
              statusLabel={statusLabel(detail.status)}
              activeTab={activeTab}
              onSaved={retry}
            />
          </div>
        );
      }}
    />
  );
}
