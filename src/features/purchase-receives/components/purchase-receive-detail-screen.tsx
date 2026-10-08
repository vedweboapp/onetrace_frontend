"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { EntityAuditTimeline } from "@/features/audit-trails/components/entity-audit-timeline";
import { AUDIT_TRAIL_MODULES } from "@/features/audit-trails/constants/audit-trail-modules";
import { fetchPurchaseReceive } from "@/features/purchase-receives/api/purchase-receive.api";
import { PurchaseReceiveDetailBody } from "@/features/purchase-receives/components/purchase-receive-detail-body";
import type { PurchaseReceiveDetail } from "@/features/purchase-receives/types/purchase-receive.types";
import { normalizePurchaseReceiveStatus } from "@/features/purchase-receives/utils/purchase-receive-nested-fields.util";
import { fetchVendorsPage } from "@/features/vendors/api/vendor.api";
import { EntityDetailEditButton, EntityDetailScreen } from "@/shared/components/entity";
import { entityDetailTabPanelClassName } from "@/shared/components/layout/detail-tab-layout";
import { routes } from "@/shared/config/routes";
import { useTabOrderStorageKey } from "@/shared/hooks/use-tab-order-storage-key";
import { CustomizableAppTabs } from "@/shared/ui";

type Props = {
  purchaseReceiveId: number;
};

export function PurchaseReceiveDetailScreen({ purchaseReceiveId }: Props) {
  const t = useTranslations("Dashboard.purchaseReceives");
  const tAudit = useTranslations("Dashboard.auditTrails");
  const tabsStorageKey = useTabOrderStorageKey("purchaseReceiveDetail");

  const [activeTab, setActiveTab] = React.useState<"overview" | "lineItems" | "timeline">("overview");
  const [vendorNames, setVendorNames] = React.useState<Record<number, string>>({});

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

  const statusLabel = React.useCallback(
    (code: string | null | undefined) => {
      const norm = normalizePurchaseReceiveStatus(code);
      if (norm === "draft") return t("status.draft");
      if (norm === "partial") return t("status.partial");
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
    <EntityDetailScreen<PurchaseReceiveDetail>
      entityId={purchaseReceiveId}
      listSection="purchase-receives"
      listRoute={routes.dashboard.purchaseReceives}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      loadError={t("detailLoadError")}
      fetch={fetchPurchaseReceive}
      getTitle={(detail) => detail.purchase_receive_number}
      headerExtension={
        <CustomizableAppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={(id) => setActiveTab(id as "overview" | "lineItems" | "timeline")}
          storageKey={tabsStorageKey}
        />
      }
      actions={({ listBack }) => (
        <EntityDetailEditButton
          listBack={listBack}
          fallbackRoute={routes.dashboard.purchaseReceives}
          label={t("edit")}
        />
      )}
      renderSurface={({ detail, dateFmt }) => {
        if (!detail) return null;
        if (activeTab === "timeline") {
          return (
            <div
              role="tabpanel"
              id={`purchase-receive-detail-tab-${activeTab}`}
              aria-labelledby={`purchase-receive-detail-tab-trigger-${activeTab}`}
              className={entityDetailTabPanelClassName}
            >
              <EntityAuditTimeline
                module={AUDIT_TRAIL_MODULES.purchaseReceive}
                objectId={detail.id}
                dateFmt={dateFmt}
              />
            </div>
          );
        }
        return (
          <div
            role="tabpanel"
            id={`purchase-receive-detail-tab-${activeTab}`}
            aria-labelledby={`purchase-receive-detail-tab-trigger-${activeTab}`}
            className={entityDetailTabPanelClassName}
          >
            <PurchaseReceiveDetailBody
              detail={detail}
              activeTab={activeTab}
              statusLabel={statusLabel}
              vendorNames={vendorNames}
              dateFmt={dateFmt}
            />
          </div>
        );
      }}
    />
  );
}
