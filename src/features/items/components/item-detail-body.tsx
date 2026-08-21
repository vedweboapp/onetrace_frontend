"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchGroup } from "@/features/groups/api/group.api";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { InstallationTypeChip } from "@/features/installation-types/components/installation-type-chip";
import type { Item } from "@/features/items/types/item.types";
import { fetchItemsPage, updateItem } from "@/features/items/api/item.api";
import { getInstallationTypeId, resolveInstallationTypeChipData } from "@/features/items/utils/item-installation-type.util";
import { getUnitTypeId, resolveUnitTypeShortLabel } from "@/features/items/utils/item-unit-type.util";
import { fetchUnitTypesPage } from "@/features/unit-types/api/unit-type.api";
import { formatUnitTypeShortLabel } from "@/features/unit-types/utils/unit-type-display.util";
import { fetchInstallationTypesPage } from "@/features/installation-types/api/installation-type.api";
import type { UnitType } from "@/features/unit-types/types/unit-type.types";
import type { InstallationCostType } from "@/features/items/types/item.types";
import {
  hasItemAttachment,
  resolveItemAttachmentLabel,
  resolveItemAttachmentUrl,
} from "@/features/items/utils/item-attachment-display.util";
import { routes } from "@/shared/config/routes";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import { DetailMultiValue, DetailMultiValueItem } from "@/shared/components/layout/detail-multi-value";
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
import { useDetailPatch } from "@/shared/hooks/use-entity-detail-screen";
import { parseOrgMoneyInput } from "@/shared/money/format-money.util";
import { getOrgCurrencySettings } from "@/shared/money/org-currency.store";
import { useOrgCurrency } from "@/shared/money/use-org-currency";
import { useOrgNumber } from "@/shared/number/use-org-number";
import { fetchVendorsPage } from "@/features/vendors/api/vendor.api";
import { getItemVendorIds, itemVendorRows, vendorIdsPayload } from "@/features/items/utils/item-vendors.util";

function installationCostTypeLabel(
  value: InstallationCostType | string | null | undefined,
  t: (key: "installationCostFixed" | "installationCostRate") => string,
): string {
  return value === "rate_per_hr" ? t("installationCostRate") : t("installationCostFixed");
}

function formatQuantityWithUnit(quantity: Item["quantity"], unitLabel: string, formatted: string): string {
  if (quantity == null) return "—";
  if (unitLabel !== "—") return `${formatted} ${unitLabel}`;
  return formatted;
}

function formatValueWithUnit(value: string | number | null | undefined, unit: string | null | undefined): string {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return "—";
  const suffix = unit?.trim();
  return suffix ? `${raw} ${suffix}` : raw;
}

function parseRequiredNumber(next: string): number {
  const n = Number(String(next).trim());
  if (!Number.isFinite(n)) {
    throw new Error("Invalid number");
  }
  return n;
}

function parseRequiredMoney(next: string): number {
  const n = parseOrgMoneyInput(next, getOrgCurrencySettings());
  if (!Number.isFinite(n)) {
    throw new Error("Invalid number");
  }
  return n;
}

export function ItemDetailBody({
  detail,
  dateFmt,
  onSaved,
}: {
  detail: Item;
  dateFmt: Intl.DateTimeFormat;
  /** Refresh detail after a successful quick-edit PATCH. */
  onSaved?: () => void;
}) {
  const t = useTranslations("Dashboard.items");
  const tMeta = useTranslations("Dashboard.common.detail");
  const tActions = useTranslations("Dashboard.common.actions");
  const tStatus = useTranslations("Dashboard.clients.status");
  const { formatMoneyValue: moneyDisplay } = useOrgCurrency();
  const { formatQuantity } = useOrgNumber();
  const [childItemsById, setChildItemsById] = React.useState<Map<number, Item>>(new Map());
  const [groupName, setGroupName] = React.useState<string | null>(null);
  const [unitTypesById, setUnitTypesById] = React.useState<Record<number, Pick<UnitType, "id" | "name" | "short_form">>>({});
  const [unitTypeOptions, setUnitTypeOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [installationTypeOptions, setInstallationTypeOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [vendorOptions, setVendorOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [vendorLabelById, setVendorLabelById] = React.useState<Record<number, string>>({});

  const groupId = typeof detail.group === "number" && Number.isFinite(detail.group) && detail.group > 0 ? detail.group : null;
  const installationTypeChip = resolveInstallationTypeChipData(detail.installation_type);
  const unitTypeId = getUnitTypeId(detail.unit_type);
  const installationTypeId = getInstallationTypeId(detail.installation_type);
  const unitTypeLabel = resolveUnitTypeShortLabel(detail.unit_type, unitTypesById);
  const vendorRows = itemVendorRows(detail, vendorLabelById);
  const vendorIds = getItemVendorIds(detail);
  const components = detail.components ?? [];
  const attachments = detail.is_composite
    ? (detail.attachments ?? []).filter(hasItemAttachment)
    : [];
  const installationCostValue = moneyDisplay(detail.installation_cost);
  const hasInstallationCost =
    detail.is_composite &&
    (installationCostValue !== "—" || Boolean(detail.installation_cost_type?.trim()));
  const installationHoursRaw =
    detail.installation_hours != null && String(detail.installation_hours).trim() !== ""
      ? String(detail.installation_hours).trim()
      : null;
  const hasInstallationHours = Boolean(detail.is_composite && installationHoursRaw);

  const patchField = useDetailPatch(
    (body: Parameters<typeof updateItem>[1]) => updateItem(detail.id, body),
    { success: t("modal.updatedToast"), error: t("loadError") },
    onSaved,
  );

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
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchUnitTypesPage(1, 500, { is_active: true });
        if (cancelled) return;
        setUnitTypesById(
          Object.fromEntries(items.map((u) => [u.id, { id: u.id, name: u.name, short_form: u.short_form }])),
        );
        setUnitTypeOptions(items.map((u) => ({ value: String(u.id), label: formatUnitTypeShortLabel(u) })));
      } catch {
        if (!cancelled) {
          setUnitTypesById({});
          setUnitTypeOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.id]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchVendorsPage(1, 500, { is_active: true });
        if (cancelled) return;
        const labels: Record<number, string> = {};
        const options: { value: string; label: string }[] = [];
        for (const row of items) {
          labels[row.id] = row.name;
          options.push({ value: String(row.id), label: row.name });
        }
        setVendorLabelById(labels);
        setVendorOptions(options);
      } catch {
        if (!cancelled) {
          setVendorLabelById({});
          setVendorOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.id]);

  React.useEffect(() => {
    if (!detail.is_composite) {
      setInstallationTypeOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchInstallationTypesPage(1, 500, { is_active: true });
        if (!cancelled) {
          setInstallationTypeOptions(
            items.map((row) => ({
              value: String(row.id),
              label: row.installation_type?.trim() || `#${row.id}`,
            })),
          );
        }
      } catch {
        if (!cancelled) setInstallationTypeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.id, detail.is_composite]);

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <DetailMetricsGrid>
            {typeof detail.is_active === "boolean" ? (
              <DetailStatusMetric
                label="Status"
                isActive={detail.is_active}
                activeLabel={tStatus("active")}
                inactiveLabel={tStatus("inactive")}
              />
            ) : null}
            <DetailEditableField
              label={t("detail.sku")}
              value={detail.sku ?? ""}
              kind="text"
              required
              requiredMessage={t("modal.skuError")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ sku: next.trim() })}
            >
              <span className="font-mono">{detail.sku?.trim() ? detail.sku : null}</span>
            </DetailEditableField>
            <DetailEditableField
              label={t("detail.quantity")}
              value={detail.quantity != null ? String(detail.quantity) : ""}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ quantity: parseRequiredNumber(next) })}
            >
              <span className="tabular-nums">
                {unitTypeLabel !== "—"
                  ? formatQuantityWithUnit(detail.quantity, unitTypeLabel, formatQuantity(detail.quantity))
                  : formatQuantity(detail.quantity)}
              </span>
            </DetailEditableField>
            {unitTypeOptions.length > 0 ? (
              <DetailEditableField
                label={t("detail.unitType")}
                value={unitTypeId != null ? String(unitTypeId) : ""}
                kind="select"
                options={unitTypeOptions}
                editAriaLabel={tActions("edit")}
                onSave={(next) => patchField({ unit_type: Number(next) })}
              >
                <span>{unitTypeLabel !== "—" ? unitTypeLabel : null}</span>
              </DetailEditableField>
            ) : unitTypeLabel !== "—" ? (
              <DetailMetricCard label={t("detail.unitType")}>
                <span>{unitTypeLabel}</span>
              </DetailMetricCard>
            ) : null}
            <DetailEditableField
              label={t("detail.reorder")}
              value={detail.reorder_quantity != null ? String(detail.reorder_quantity) : ""}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ reorder_quantity: parseRequiredNumber(next) })}
            >
              <span className="tabular-nums">{formatQuantity(detail.reorder_quantity)}</span>
            </DetailEditableField>
            <DetailEditableField
              label={t("detail.cost")}
              value={detail.cost_price != null ? String(detail.cost_price) : ""}
              kind="money"
              required
              requiredMessage={t("modal.costPriceError")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ cost_price: parseRequiredMoney(next) })}
            >
              <span className="tabular-nums">{moneyDisplay(detail.cost_price)}</span>
            </DetailEditableField>
            <DetailEditableField
              label={t("detail.sell")}
              value={detail.selling_price != null ? String(detail.selling_price) : ""}
              kind="money"
              required
              requiredMessage={t("modal.sellingPriceError")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ selling_price: parseRequiredMoney(next) })}
            >
              <span className="tabular-nums">{moneyDisplay(detail.selling_price)}</span>
            </DetailEditableField>
            <DetailEditableField
              label={t("detail.vendors")}
              kind="multiselect"
              values={vendorIds.map(String)}
              options={vendorOptions}
              selectSearchable
              editAriaLabel={tActions("edit")}
              empty="—"
              onSaveValues={(next) => patchField(vendorIdsPayload(next))}
            >
              <DetailMultiValue>
                {vendorRows.map((row) => (
                  <DetailMultiValueItem
                    key={row.id}
                    href={`${routes.dashboard.vendors}/${row.id}`}
                    title={row.label}
                  >
                    {row.label}
                  </DetailMultiValueItem>
                ))}
              </DetailMultiValue>
            </DetailEditableField>
            {installationTypeChip && installationTypeOptions.length > 0 ? (
              <DetailEditableField
                label={t("detail.installationType")}
                value={installationTypeId != null ? String(installationTypeId) : ""}
                kind="select"
                options={installationTypeOptions}
                editAriaLabel={tActions("edit")}
                onSave={(next) => patchField({ installation_type: Number(next) })}
              >
                <InstallationTypeChip row={installationTypeChip} />
              </DetailEditableField>
            ) : installationTypeChip ? (
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
            {hasInstallationHours ? (
              <DetailEditableField
                label={t("detail.installationHours")}
                value={installationHoursRaw ?? ""}
                kind="text"
                editAriaLabel={tActions("edit")}
                onSave={(next) => patchField({ installation_hours: parseRequiredNumber(next) })}
              >
                <span className="tabular-nums">{installationHoursRaw}</span>
              </DetailEditableField>
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
                  className="font-semibold text-blue-600 underline-offset-2 hover:underline"
                >
                  {groupName ?? "—"}
                </DetailEntityLink>
              </DetailMetricCard>
            ) : null}
          </DetailMetricsGrid>
          </DetailPanelCard>

        {detail.is_composite ? (
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
                          className="block truncate text-blue-600 underline-offset-2 hover:underline"
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
        ) : null}

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
                          className="block truncate text-blue-600 underline-offset-2 hover:underline"
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
