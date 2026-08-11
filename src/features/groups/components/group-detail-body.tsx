"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { fetchCompositeItemsPage } from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { updateGroup } from "@/features/groups/api/group.api";
import type { Group } from "@/features/groups/types/group.types";
import { routes } from "@/shared/config/routes";
import { useOrgCurrency } from "@/shared/money/use-org-currency";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import {
  DetailLinkedTable,
  DetailLinkedTableRow,
  DetailLinkedTableTd,
  detailLinkedTableCellClassName,
} from "@/shared/components/layout/detail-linked-table";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  DetailStatusMetric,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";

function formatLinkedItemLabel(name: string, abbreviation?: string | null) {
  const abbr = abbreviation?.trim();
  if (!abbr) return name;
  return (
    <>
      {name}
      <span className="font-normal text-slate-500 dark:text-slate-400"> ({abbr})</span>
    </>
  );
}

export function GroupDetailBody({
  detail,
  dateFmt,
  onSaved,
}: {
  detail: Group;
  dateFmt: Intl.DateTimeFormat;
  /** Refresh detail after a successful quick-edit PATCH. */
  onSaved?: () => void;
}) {
  const t = useTranslations("Dashboard.groups");
  const tMeta = useTranslations("Dashboard.common.detail");
  const tActions = useTranslations("Dashboard.common.actions");
  const { formatMoneyValue: moneyDisplay } = useOrgCurrency();
  const linkedItems = detail.items ?? [];
  const [compositeById, setCompositeById] = React.useState<Map<number, CompositeItem>>(new Map());

  async function patchField(body: Parameters<typeof updateGroup>[1]) {
    try {
      await updateGroup(detail.id, body);
      toastSuccess(t("modal.updatedToast"));
      onSaved?.();
    } catch (error) {
      toastApiError(error, t("detailLoadError"));
      throw error;
    }
  }

  React.useEffect(() => {
    if (linkedItems.length === 0) {
      setCompositeById(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchCompositeItemsPage(1, 500);
        if (cancelled) return;
        setCompositeById(new Map(items.map((it) => [it.id, it])));
      } catch {
        if (!cancelled) setCompositeById(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.id, linkedItems.length]);

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <DetailMetricsGrid>
            <DetailEditableField
              label={t("table.name")}
              value={detail.name}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ name: next.trim() })}
            >
              <span className="break-words">{detail.name}</span>
            </DetailEditableField>
            <DetailStatusMetric
              label={t("table.status")}
              isActive={detail.is_active}
              activeLabel={t("statusActive")}
              inactiveLabel={t("statusInactive")}
            />
            <DetailMetricCard label={t("table.itemCount")}>
              <span className="tabular-nums">{linkedItems.length}</span>
            </DetailMetricCard>
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionItems")}>
          {linkedItems.length > 0 ? (
            <DetailLinkedTable
              rowNumberHeader={t("detail.colNo")}
              columns={[
                { id: "item", header: t("detail.colItem"), widthClass: "w-[38%]" },
                {
                  id: "components",
                  header: t("detail.colComponentCount"),
                  narrow: true,
                  align: "right",
                  widthClass: "w-[14%]",
                },
                { id: "qty", header: t("detail.colQuantity"), narrow: true, align: "right", widthClass: "w-[12%]" },
                { id: "cost", header: t("detail.colCost"), narrow: true, align: "right", widthClass: "w-[18%]" },
                { id: "sell", header: t("detail.colSell"), narrow: true, align: "right", widthClass: "w-[18%]" },
              ]}
            >
              {linkedItems.map((entry, index) => {
                const composite = compositeById.get(entry.item);
                const displayName = entry.item_name ?? composite?.name ?? "—";
                const componentCount = composite?.components?.length ?? 0;
                return (
                  <DetailLinkedTableRow key={`${entry.id ?? index}-${entry.item}`} index={index}>
                    <DetailLinkedTableTd
                      className={detailLinkedTableCellClassName({
                        align: "left",
                        cellClassName: "font-medium text-slate-900 dark:text-slate-100",
                      })}
                    >
                      <DetailEntityLink
                        href={`${routes.dashboard.compositeItems}/${entry.item}`}
                        className="block truncate text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                      >
                        {formatLinkedItemLabel(displayName, entry.abbreviation)}
                      </DetailEntityLink>
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      narrow
                      className={detailLinkedTableCellClassName({ align: "right", narrow: true, cellClassName: "tabular-nums" })}
                    >
                      {composite ? componentCount : "—"}
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      narrow
                      className={detailLinkedTableCellClassName({ align: "right", narrow: true, cellClassName: "tabular-nums" })}
                    >
                      {composite?.quantity ?? "—"}
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      narrow
                      className={detailLinkedTableCellClassName({ align: "right", narrow: true, cellClassName: "tabular-nums" })}
                    >
                      {moneyDisplay(composite?.cost_price)}
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      narrow
                      className={detailLinkedTableCellClassName({ align: "right", narrow: true, cellClassName: "tabular-nums" })}
                    >
                      {moneyDisplay(composite?.selling_price)}
                    </DetailLinkedTableTd>
                  </DetailLinkedTableRow>
                );
              })}
            </DetailLinkedTable>
          ) : (
            <p className="text-sm font-normal text-slate-500 dark:text-slate-400">{t("detail.noItems")}</p>
          )}
        </DetailPanelCard>

        <DetailSystemMetadataSection
          createdAt={detail.created_at}
          modifiedAt={detail.modified_at}
          dateFmt={dateFmt}
          createdBy={detail.created_by}
          modifiedBy={detail.modified_by}
          labels={{
            sectionTitle: tMeta("systemMetadata"),
            createdAt: t("fields.createdAt"),
            updatedAt: t("fields.updatedAt"),
            createdBy: t("detail.createdBy"),
            modifiedBy: tMeta("modifiedBy"),
            notModifiedYet: tMeta("notModifiedYet"),
          }}
        />
      </div>
    </DetailPagePadding>
  );
}
