"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchDispatch, updateDispatchAttachments } from "@/features/dispatches/api/dispatch.api";
import { DISPATCH_PATHS } from "@/features/dispatches/api/dispatch.paths";
import { DispatchDetailBody } from "@/features/dispatches/components/dispatch-detail-body";
import type { DispatchDetail } from "@/features/dispatches/types/dispatch.types";
import { EntityAttachmentsTab } from "@/shared/attachments/entity-attachments-tab";
import { EntityNotesTab } from "@/shared/notes/entity-notes-tab";
import { EntityDetailScreen } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { useTabOrderStorageKey } from "@/shared/hooks/use-tab-order-storage-key";
import { CustomizableAppTabs, type AppTabItem } from "@/shared/ui";

type Props = {
  dispatchId: number;
};

export function DispatchDetailScreen({ dispatchId }: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const tCommon = useTranslations("Dashboard.common");
  const tAudit = useTranslations("Dashboard.auditTrails");
  const tabsStorageKey = useTabOrderStorageKey("dispatchDetail");
  const [activeTab, setActiveTab] = React.useState("details");
  const dueFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "details", label: tAudit("tabDetails") },
      { id: "attachments", label: tCommon("attachmentsTab.title") },
      { id: "notes", label: tCommon("notesTab.title") },
    ],
    [tAudit, tCommon],
  );

  return (
    <EntityDetailScreen<DispatchDetail>
      entityId={dispatchId}
      listSection="dispatches"
      listRoute={routes.dashboard.dispatches}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      loadError={t("detailLoadError")}
      fetch={fetchDispatch}
      getTitle={(detail) => detail.dispatch_order_number}
      headerExtension={
        <CustomizableAppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={setActiveTab}
          storageKey={tabsStorageKey}
          ariaLabel={t("detail.backAria")}
          panelIdPrefix="dispatch-detail-tab"
          className="-mx-1 px-1 sm:-mx-0 sm:px-0"
        />
      }
    >
      {({ detail, dateFmt, retry }) =>
        activeTab === "attachments" ? (
          <EntityAttachmentsTab
            entityId={detail.id}
            attachments={detail.attachments}
            emptyIconName="dispatches"
            updateAttachments={(refs) => updateDispatchAttachments(detail.id, refs)}
            onSaved={retry}
          />
        ) : activeTab === "notes" ? (
          <EntityNotesTab detailPath={DISPATCH_PATHS.detail(detail.id)} />
        ) : (
          <DispatchDetailBody detail={detail} dateFmt={dateFmt} dueFmt={dueFmt} />
        )
      }
    </EntityDetailScreen>
  );
}
