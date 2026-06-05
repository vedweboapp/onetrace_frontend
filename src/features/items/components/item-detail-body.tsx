"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { InstallationTypeChip } from "@/features/installation-types/components/installation-type-chip";
import type { Item } from "@/features/items/types/item.types";
import { fetchItemsPage } from "@/features/items/api/item.api";
import { resolveInstallationTypeChipData } from "@/features/items/utils/item-installation-type.util";
import { routes } from "@/shared/config/routes";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
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

function moneyDisplay(v: unknown): string {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

export function ItemDetailBody({
  detail,
  dateFmt,
}: {
  detail: Item;
  dateFmt: Intl.DateTimeFormat;
}) {
  const t = useTranslations("Dashboard.items");
  const tMeta = useTranslations("Dashboard.common.detail");
  const tStatus = useTranslations("Dashboard.clients.status");
  const [childItemsById, setChildItemsById] = React.useState<Map<number, Item>>(new Map());

  const groupId = typeof detail.group === "number" && Number.isFinite(detail.group) && detail.group > 0 ? detail.group : null;
  const installationTypeChip = resolveInstallationTypeChipData(detail.installation_type);
  const components = detail.components ?? [];

  React.useEffect(() => {
    if (!detail.is_composite || components.length === 0) {
      setChildItemsById(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchItemsPage(1, 500, { isComposite: false });
        if (cancelled) return;
        setChildItemsById(new Map(items.map((it) => [it.id, it])));
      } catch {
        if (!cancelled) setChildItemsById(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.id, detail.is_composite, components.length]);

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <DetailMetricsGrid className="lg:grid-cols-2">
            {typeof detail.is_active === "boolean" ? (
              <DetailStatusMetric
                label="Status"
                isActive={detail.is_active}
                activeLabel={tStatus("active")}
                inactiveLabel={tStatus("inactive")}
              />
            ) : null}
            <DetailMetricCard label={t("detail.sku")}>
              <span className="font-mono">{detail.sku?.trim() ? detail.sku : "—"}</span>
            </DetailMetricCard>
            <DetailMetricCard label={t("detail.quantity")}>
              <span className="tabular-nums">{detail.quantity ?? "—"}</span>
            </DetailMetricCard>
            <DetailMetricCard label={t("detail.reorder")}>
              <span className="tabular-nums">{detail.reorder_quantity ?? "—"}</span>
            </DetailMetricCard>
            <DetailMetricCard label={t("detail.cost")}>
              <span className="tabular-nums">{moneyDisplay(detail.cost_price)}</span>
            </DetailMetricCard>
            <DetailMetricCard label={t("detail.sell")}>
              <span className="tabular-nums">{moneyDisplay(detail.selling_price)}</span>
            </DetailMetricCard>
            {installationTypeChip ? (
              <DetailMetricCard label={t("detail.installationType")}>
                <InstallationTypeChip row={installationTypeChip} />
              </DetailMetricCard>
            ) : null}
            {groupId ? (
              <DetailMetricCard label={t("detail.group")}>
                <Link
                  href={`${routes.dashboard.groups}/${groupId}`}
                  className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  #{groupId}
                </Link>
              </DetailMetricCard>
            ) : null}
          </DetailMetricsGrid>
        </DetailPanelCard>

        {detail.is_composite ? (
          <DetailPanelCard title={t("detail.sectionComponents")}>
            {components.length > 0 ? (
              <DetailLinkedTable
                rowNumberHeader={t("detail.colNo")}
                columns={[
                  { id: "item", header: t("detail.componentItem"), widthClass: "w-[34%]" },
                  { id: "sku", header: t("detail.sku"), narrow: true, widthClass: "w-[16%]" },
                  { id: "qty", header: t("detail.componentQty"), narrow: true, align: "right", widthClass: "w-[12%]" },
                  { id: "cost", header: t("detail.cost"), narrow: true, align: "right", widthClass: "w-[19%]" },
                  { id: "sell", header: t("detail.sell"), narrow: true, align: "right", widthClass: "w-[19%]" },
                ]}
              >
                {components.map((component, index) => {
                  const child = childItemsById.get(component.child_item);
                  return (
                    <DetailLinkedTableRow key={`${component.child_item}-${index}`} index={index}>
                      <DetailLinkedTableTd
                        className={detailLinkedTableCellClassName({
                          cellClassName: "font-medium text-slate-900 dark:text-slate-100",
                        })}
                      >
                        <Link
                          href={`${routes.dashboard.items}/${component.child_item}`}
                          className="block truncate text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                        >
                          {child?.name ?? `${t("detail.componentItem")} #${component.child_item}`}
                        </Link>
                      </DetailLinkedTableTd>
                      <DetailLinkedTableTd
                        narrow
                        className={detailLinkedTableCellClassName({ narrow: true, cellClassName: "font-mono text-xs" })}
                      >
                        {child?.sku?.trim() ? child.sku : "—"}
                      </DetailLinkedTableTd>
                      <DetailLinkedTableTd
                        narrow
                        className={detailLinkedTableCellClassName({ align: "right", narrow: true, cellClassName: "tabular-nums" })}
                      >
                        {component.quantity}
                      </DetailLinkedTableTd>
                      <DetailLinkedTableTd
                        narrow
                        className={detailLinkedTableCellClassName({ align: "right", narrow: true, cellClassName: "tabular-nums" })}
                      >
                        {moneyDisplay(child?.cost_price)}
                      </DetailLinkedTableTd>
                      <DetailLinkedTableTd
                        narrow
                        className={detailLinkedTableCellClassName({ align: "right", narrow: true, cellClassName: "tabular-nums" })}
                      >
                        {moneyDisplay(child?.selling_price)}
                      </DetailLinkedTableTd>
                    </DetailLinkedTableRow>
                  );
                })}
              </DetailLinkedTable>
            ) : (
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400">{t("detail.noComponents")}</p>
            )}
          </DetailPanelCard>
        ) : null}

        <DetailSystemMetadataSection
          createdAt={detail.created_at}
          modifiedAt={detail.modified_at}
          dateFmt={dateFmt}
          createdBy={detail.created_by}
          modifiedBy={detail.modified_by}
          labels={{
            sectionTitle: tMeta("systemMetadata"),
            createdAt: t("detail.createdAt"),
            updatedAt: t("detail.updatedAt"),
            createdBy: t("detail.createdBy"),
            modifiedBy: tMeta("modifiedBy"),
            notModifiedYet: tMeta("notModifiedYet"),
          }}
        />
      </div>
    </DetailPagePadding>
  );
}
