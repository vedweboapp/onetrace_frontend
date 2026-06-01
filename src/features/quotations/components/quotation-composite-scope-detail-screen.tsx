/**
 * Per-composite catalog breakdown (disabled). Routes under quotations/.../composite/... redirect.
 * Use Scope & Pricing composite rows for qty / unit / total instead.
 */
"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { fetchCompositeItem } from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { fetchItemsPage } from "@/features/items/api/item.api";
import type { Item } from "@/features/items/types/item.types";
import { parseCompositeScopeRepeat } from "@/features/quotations/utils/quotation-composite-scope-nav.util";
import { loadQuotationScopePinDetails } from "@/features/quotations/utils/quotation-composite-scope-pins.util";
import { formatMoneyDisplay } from "@/features/quotations/utils/quotation-level-pricing.util";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
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
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { normalizeQuotationScopeBackHref } from "@/features/quotations/utils/quotation-block-scope.util";
import { mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";
import { AppButton, SurfaceShell } from "@/shared/ui";

function parseUnitPrice(detail: CompositeItem): number {
  const n =
    typeof detail.selling_price === "number"
      ? detail.selling_price
      : typeof detail.selling_price === "string"
        ? Number(detail.selling_price)
        : Number.NaN;
  return Number.isFinite(n) ? n : 0;
}

function childUnitPrice(child: Item | undefined): number {
  if (!child) return 0;
  const n =
    typeof child.selling_price === "number"
      ? child.selling_price
      : typeof child.selling_price === "string"
        ? Number(child.selling_price)
        : Number.NaN;
  return Number.isFinite(n) ? n : 0;
}

type Props = {
  compositeItemId: number;
  defaultBackHref: string;
};

export function QuotationCompositeScopeDetailScreen({ compositeItemId, defaultBackHref }: Props) {
  const t = useTranslations("Dashboard.quotations.compositeScope");
  const tItems = useTranslations("Dashboard.items");
  const locale = useLocale();
  const loc = locale === "es" ? "es" : "en";
  const searchParams = useSearchParams();

  const repeatCount = parseCompositeScopeRepeat(searchParams.get("repeat"));
  const sectionLabel = searchParams.get("section")?.trim() || null;
  const plotLabel = searchParams.get("plot")?.trim() || null;
  const pinDetailsKey = searchParams.get("pinDetailsKey");
  const pinDetails = React.useMemo(() => loadQuotationScopePinDetails(pinDetailsKey), [pinDetailsKey]);
  const backHref = React.useMemo(
    () =>
      normalizeQuotationScopeBackHref(
        searchParams.get("back"),
        mergeUrlQueryParam(defaultBackHref, "tab", "pricing"),
      ),
    [searchParams, defaultBackHref],
  );

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<CompositeItem | null>(null);
  const [childItemsById, setChildItemsById] = React.useState<Map<number, Item>>(new Map());

  React.useEffect(() => {
    if (pinDetails) {
      setLoading(false);
      setError(null);
      setDetail(null);
      setChildItemsById(new Map());
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const row = await fetchCompositeItem(compositeItemId);
        if (cancelled) return;
        setDetail(row);
        const components = row.components ?? [];
        if (components.length === 0) {
          setChildItemsById(new Map());
          return;
        }
        const { items } = await fetchItemsPage(1, 500, { isComposite: false });
        if (cancelled) return;
        setChildItemsById(new Map(items.map((it) => [it.id, it])));
      } catch {
        if (!cancelled) {
          setDetail(null);
          setError(t("loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compositeItemId, t, pinDetails]);

  const components = detail?.components ?? [];
  const packageUnitPrice = detail ? parseUnitPrice(detail) : 0;
  const scopeLineTotal = packageUnitPrice * repeatCount;
  const contextParts = [pinDetails?.sectionLabel ?? sectionLabel, pinDetails?.plotLabel ?? plotLabel].filter(Boolean);
  const pinTotalQty = pinDetails ? pinDetails.rows.reduce((sum, row) => sum + row.quantity, 0) : 0;
  const pinTotalAmount = pinDetails ? pinDetails.rows.reduce((sum, row) => sum + row.pins_total, 0) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DetailPageHeader
        title={loading ? t("loadingTitle") : (pinDetails?.title ?? detail?.name ?? t("loadingTitle"))}
        backHref={backHref}
        backAriaLabel={t("backAria")}
        subtitle={
          contextParts.length > 0 ? (
            <span>
              {contextParts.join(" · ")}
              {pinDetails ? null : repeatCount > 1 ? (
                <span className="ml-2 font-medium text-slate-700 dark:text-slate-200">
                  {t("repeatBadge", { count: repeatCount })}
                </span>
              ) : null}
            </span>
          ) : pinDetails ? null : repeatCount > 1 ? (
            t("repeatBadge", { count: repeatCount })
          ) : null
        }
      />

      <DetailPagePadding className="flex-1">
        {loading ? (
          <SurfaceShell className="p-6 text-sm text-slate-500 dark:text-slate-400">{t("loadingTitle")}</SurfaceShell>
        ) : error ? (
          <SurfaceShell className="space-y-3 p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <AppButton type="button" variant="secondary" size="sm" onClick={() => window.location.reload()}>
              {tItems("detail.retry")}
            </AppButton>
          </SurfaceShell>
        ) : pinDetails ? (
          <div className={detailPageStackClassName}>
            <DetailPanelCard >
              <DetailMetricsGrid className="sm:grid-cols-2 lg:grid-cols-3">
                <DetailMetricCard label={t("colQtyInScope")}>
                  <span className="tabular-nums font-semibold">{pinTotalQty}</span>
                </DetailMetricCard>
                <DetailMetricCard label={t("colLineTotal")}>
                  <span className="tabular-nums font-semibold text-[color:var(--dash-accent)]">
                    {formatMoneyDisplay(pinTotalAmount, loc)}
                  </span>
                </DetailMetricCard>
              </DetailMetricsGrid>
            </DetailPanelCard>

          <DetailPanelCard title={t("sectionComponents")}>
  {pinDetails.rows.length > 0 ? (
    <DetailLinkedTable
      columns={[
        {
          id: "product",
          header: (
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("colProductName")}
            </span>
          ),
        },
        {
          id: "qty",
          header: (
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("colQtyInScope")}
            </span>
          ),
        },
        {
          id: "unit",
          header: (
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("colUnitPrice")}
            </span>
          ),
        },
        {
          id: "line",
          header: (
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("colLineTotal")}
            </span>
          ),
        },
      ]}
    >
      {pinDetails.rows.map((row, index) => (
        <DetailLinkedTableRow
          key={`${row.pin_id ?? "draft"}-${row.pins_order}-${index}`}
          index={index}
        >
          {/* Product Name */}
          <DetailLinkedTableTd
            className={detailLinkedTableCellClassName({
              cellClassName:
                "font-medium text-slate-700 dark:text-slate-200 min-w-[220px]",
            })}
          >
            {row.name || "-"}
          </DetailLinkedTableTd>

          {/* Quantity */}
          <DetailLinkedTableTd
            narrow
            className={detailLinkedTableCellClassName({
              cellClassName:
                "tabular-nums text-slate-600 dark:text-slate-300",
            })}
          >
            {row.quantity}
          </DetailLinkedTableTd>

          {/* Unit Price */}
          <DetailLinkedTableTd
            narrow
            className={detailLinkedTableCellClassName({
              cellClassName:
                "tabular-nums text-slate-600 dark:text-slate-300",
            })}
          >
            {formatMoneyDisplay(row.selling_price, loc)}
          </DetailLinkedTableTd>

          {/* Line Total */}
          <DetailLinkedTableTd
            narrow
            className={detailLinkedTableCellClassName({
              cellClassName:
                "tabular-nums font-semibold text-slate-900 dark:text-white",
            })}
          >
            {formatMoneyDisplay(row.pins_total, loc)}
          </DetailLinkedTableTd>
        </DetailLinkedTableRow>
      ))}
    </DetailLinkedTable>
  ) : (
    <p className="text-sm text-slate-500 dark:text-slate-400">
      {t("noComponents")}
    </p>
  )}
</DetailPanelCard>
          </div>
        ) : detail ? (
          <div className={detailPageStackClassName}>
            <DetailPanelCard title={t("sectionQuoteLine")}>
              <DetailMetricsGrid className="sm:grid-cols-2 lg:grid-cols-3">
                {repeatCount > 1 ? (
                  <DetailMetricCard label={t("includedTimes")}>
                    <span className="tabular-nums font-semibold">×{repeatCount}</span>
                  </DetailMetricCard>
                ) : null}
                <DetailMetricCard label={t("packagePrice")}>
                  <span className="tabular-nums">{formatMoneyDisplay(packageUnitPrice, loc)}</span>
                </DetailMetricCard>
                <DetailMetricCard label={t("scopeLineTotal")}>
                  <span className="tabular-nums font-semibold text-[color:var(--dash-accent)]">
                    {formatMoneyDisplay(scopeLineTotal, loc)}
                  </span>
                </DetailMetricCard>
              </DetailMetricsGrid>
            </DetailPanelCard>

            <DetailPanelCard title={tItems("detail.sectionOverview")}>
              <DetailMetricsGrid className="lg:grid-cols-2">
                <DetailMetricCard label={tItems("detail.sku")}>
                  <span className="font-mono">{detail.sku?.trim() ? detail.sku : "—"}</span>
                </DetailMetricCard>
                <DetailMetricCard label={tItems("detail.cost")}>
                  <span className="tabular-nums">
                    {formatMoneyDisplay(
                      typeof detail.cost_price === "number"
                        ? detail.cost_price
                        : typeof detail.cost_price === "string"
                          ? Number(detail.cost_price)
                          : Number.NaN,
                      loc,
                    )}
                  </span>
                </DetailMetricCard>
                <DetailMetricCard label={tItems("detail.sell")}>
                  <span className="tabular-nums">{formatMoneyDisplay(packageUnitPrice, loc)}</span>
                </DetailMetricCard>
              </DetailMetricsGrid>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                <Link
                  href={`${routes.dashboard.compositeItems}/${detail.id}`}
                  className="font-medium text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {t("openCatalogItem")}
                </Link>
              </p>
            </DetailPanelCard>

            <DetailPanelCard title={t("sectionComponents")}>
              {components.length > 0 ? (
                <DetailLinkedTable
                  rowNumberHeader={tItems("detail.colNo")}
                  columns={[
                    { id: "item", header: tItems("detail.componentItem"), widthClass: "w-[30%]" },
                    { id: "sku", header: tItems("detail.sku"), narrow: true, widthClass: "w-[14%]" },
                    { id: "qty", header: t("colQtyPerPackage"), narrow: true, align: "right", widthClass: "w-[12%]" },
                    { id: "scopeQty", header: t("colQtyInScope"), narrow: true, align: "right", widthClass: "w-[12%]" },
                    { id: "unit", header: t("colUnitPrice"), narrow: true, align: "right", widthClass: "w-[16%]" },
                    { id: "line", header: t("colLineTotal"), narrow: true, align: "right", widthClass: "w-[16%]" },
                  ]}
                >
                  {components.map((component, index) => {
                    const child = childItemsById.get(component.child_item);
                    const perPackageQty = component.quantity;
                    const scopeQty = perPackageQty * repeatCount;
                    const unit = childUnitPrice(child);
                    const lineTotal = unit * scopeQty;
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
                            {child?.name ?? `${tItems("detail.componentItem")} #${component.child_item}`}
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
                          {perPackageQty}
                        </DetailLinkedTableTd>
                        <DetailLinkedTableTd
                          narrow
                          className={detailLinkedTableCellClassName({
                            align: "right",
                            narrow: true,
                            cellClassName: "tabular-nums font-medium",
                          })}
                        >
                          {scopeQty}
                        </DetailLinkedTableTd>
                        <DetailLinkedTableTd
                          narrow
                          className={detailLinkedTableCellClassName({ align: "right", narrow: true, cellClassName: "tabular-nums" })}
                        >
                          {formatMoneyDisplay(unit, loc)}
                        </DetailLinkedTableTd>
                        <DetailLinkedTableTd
                          narrow
                          className={detailLinkedTableCellClassName({
                            align: "right",
                            narrow: true,
                            cellClassName: "tabular-nums font-medium",
                          })}
                        >
                          {formatMoneyDisplay(lineTotal, loc)}
                        </DetailLinkedTableTd>
                      </DetailLinkedTableRow>
                    );
                  })}
                </DetailLinkedTable>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("noComponents")}</p>
              )}
            </DetailPanelCard>
          </div>
        ) : null}
      </DetailPagePadding>
    </div>
  );
}
