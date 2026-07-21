"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchGroup } from "@/features/groups/api/group.api";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { InstallationTypeChip } from "@/features/installation-types/components/installation-type-chip";
import type { Item } from "@/features/items/types/item.types";
import { fetchItemsPage } from "@/features/items/api/item.api";
import { resolveInstallationTypeChipData } from "@/features/items/utils/item-installation-type.util";
import { resolveUnitTypeShortLabel } from "@/features/items/utils/item-unit-type.util";
import { fetchUnitTypesPage } from "@/features/unit-types/api/unit-type.api";
import type { UnitType } from "@/features/unit-types/types/unit-type.types";
import type { InstallationCostType } from "@/features/items/types/item.types";
import {
  hasItemAttachment,
  resolveItemAttachmentLabel,
  resolveItemAttachmentUrl,
} from "@/features/items/utils/item-attachment-display.util";
import { routes } from "@/shared/config/routes";
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

function installationCostTypeLabel(
  value: InstallationCostType | string | null | undefined,
  t: (key: "installationCostFixed" | "installationCostRate") => string,
): string {
  return value === "rate_per_hr" ? t("installationCostRate") : t("installationCostFixed");
}

function formatQuantityWithUnit(quantity: Item["quantity"], unitLabel: string): string {
  if (quantity == null) return "—";
  if (unitLabel !== "—") return `${quantity} ${unitLabel}`;
  return String(quantity);
}

function formatValueWithUnit(value: string | number | null | undefined, unit: string | null | undefined): string {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return "—";
  const suffix = unit?.trim();
  return suffix ? `${raw} ${suffix}` : raw;
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
  const [groupName, setGroupName] = React.useState<string | null>(null);
  const [unitTypesById, setUnitTypesById] = React.useState<Record<number, Pick<UnitType, "id" | "name" | "short_form">>>({});

  const groupId = typeof detail.group === "number" && Number.isFinite(detail.group) && detail.group > 0 ? detail.group : null;
  const installationTypeChip = resolveInstallationTypeChipData(detail.installation_type);
  const unitTypeLabel = resolveUnitTypeShortLabel(detail.unit_type, unitTypesById);
  const components = detail.components ?? [];
  const attachments = (detail.attachments ?? []).filter(hasItemAttachment);
  const installationCostValue = moneyDisplay(detail.installation_cost);
  const hasInstallationCost =
    detail.is_composite &&
    (installationCostValue !== "—" || Boolean(detail.installation_cost_type?.trim()));

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

  React.useEffect(() => {
    if (!groupId) {
      setGroupName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const group = await fetchGroup(groupId);
        if (!cancelled) setGroupName(group.name?.trim() || null);
      } catch {
        if (!cancelled) setGroupName(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  React.useEffect(() => {
    if (detail.unit_type == null || typeof detail.unit_type !== "number") {
      setUnitTypesById({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchUnitTypesPage(1, 500, { is_active: true });
        if (cancelled) return;
        setUnitTypesById(
          Object.fromEntries(items.map((u) => [u.id, { id: u.id, name: u.name, short_form: u.short_form }])),
        );
      } catch {
        if (!cancelled) setUnitTypesById({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.id, detail.unit_type]);

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
              <span className="tabular-nums">
                {unitTypeLabel !== "—" ? formatQuantityWithUnit(detail.quantity, unitTypeLabel) : (detail.quantity ?? "—")}
              </span>
            </DetailMetricCard>
            {unitTypeLabel !== "—" ? (
              <DetailMetricCard label={t("detail.unitType")}>
                <span>{unitTypeLabel}</span>
              </DetailMetricCard>
            ) : null}
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
            {hasInstallationCost ? (
              <DetailMetricCard label={t("detail.installationCost")}>
                <span className="tabular-nums">
                  {installationCostValue !== "—"
                    ? `${installationCostValue} (${installationCostTypeLabel(detail.installation_cost_type, (key) => t(`detail.${key}`))})`
                    : installationCostTypeLabel(detail.installation_cost_type, (key) => t(`detail.${key}`))}
                </span>
              </DetailMetricCard>
            ) : null}
            {detail.length != null || detail.width != null || detail.height != null ? (
              <DetailMetricCard label={t("detail.dimensions")}>
                <span>
                  {[
                    detail.length != null && String(detail.length).trim() !== "" ? String(detail.length) : null,
                    detail.width != null && String(detail.width).trim() !== "" ? String(detail.width) : null,
                    detail.height != null && String(detail.height).trim() !== "" ? String(detail.height) : null,
                  ]
                    .filter(Boolean)
                    .join(" x ")}
                  {detail.dimensions_unit != null && detail.dimensions_unit !== ""
                    ? ` ${detail.dimensions_unit}`
                    : ""}
                </span>
              </DetailMetricCard>
            ) : null}
            {detail.weight != null && String(detail.weight).trim() !== "" ? (
              <DetailMetricCard label={t("detail.weight")}>
                <span className="tabular-nums">{formatValueWithUnit(detail.weight, detail.weight_unit)}</span>
              </DetailMetricCard>
            ) : null}
            {groupId ? (
              <DetailMetricCard label={t("detail.group")}>
                <DetailEntityLink
                  href={`${routes.dashboard.groups}/${groupId}`}
                  className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {groupName ?? "—"}
                </DetailEntityLink>
              </DetailMetricCard>
            ) : null}
          </DetailMetricsGrid>
          </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionAttachments")}>
          {attachments.length > 0 ? (
            <ul className="space-y-2">
              {attachments.map((row, index) => {
                const href = resolveItemAttachmentUrl(row);
                const label = resolveItemAttachmentLabel(row);
                return (
                  <li
                    key={row.id ?? `${label}-${index}`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                  >
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                      >
                        {label}
                      </a>
                    ) : (
                      <span className="block truncate text-slate-800 dark:text-slate-100">{label}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm font-normal text-slate-500 dark:text-slate-400">{t("detail.noAttachments")}</p>
          )}
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
                        <DetailEntityLink
                          href={`${routes.dashboard.items}/${component.child_item}`}
                          className="block truncate text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                        >
                          {child?.name ?? "—"}
                        </DetailEntityLink>
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
