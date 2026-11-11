"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { DetailEntityLink } from "@/shared/components/entity";
import type { Group, GroupItemRef, GroupSubgroup } from "@/features/groups/types/group.types";
import { routes } from "@/shared/config/routes";
import { useOrgCurrency } from "@/shared/money/use-org-currency";
import {
  DetailLinkedTable,
  DetailLinkedTableRow,
  DetailLinkedTableTd,
  detailLinkedTableCellClassName,
} from "@/shared/components/layout/detail-linked-table";
import {
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { cn } from "@/core/utils/http.util";

function formatItemLabel(name: string, abbreviation?: string | null) {
  const abbr = abbreviation?.trim();
  if (!abbr) return name;
  return (
    <>
      {name}
      <span className="font-normal text-slate-500 dark:text-slate-400"> ({abbr})</span>
    </>
  );
}

function ItemsTable({
  items,
  t,
  moneyDisplay,
}: {
  items: GroupItemRef[];
  t: ReturnType<typeof useTranslations<"Dashboard.groups">>;
  moneyDisplay: (value: string | number | null | undefined) => string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.noItems")}</p>;
  }

  return (
    <DetailLinkedTable
      rowNumberHeader={t("detail.colNo")}
      columns={[
        { id: "item", header: t("detail.colItem"), widthClass: "w-[55%]" },
        {
          id: "components",
          header: t("detail.colComponentCount"),
          narrow: true,
          align: "right",
          widthClass: "w-[20%]",
        },
        { id: "sell", header: t("detail.colSell"), narrow: true, align: "right", widthClass: "w-[25%]" },
      ]}
    >
      {items.map((entry, index) => {
        const displayName = entry.item_name?.trim() || `#${entry.item}`;
        const componentCount = entry.components?.length ?? null;
        const sellPrice = entry.item_selling_price ?? entry.selling_price;
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
                className="block truncate text-blue-600 underline-offset-2 hover:underline"
              >
                {formatItemLabel(displayName, entry.abbreviation)}
              </DetailEntityLink>
            </DetailLinkedTableTd>
            <DetailLinkedTableTd
              narrow
              className={detailLinkedTableCellClassName({
                align: "right",
                narrow: true,
                cellClassName: "tabular-nums",
              })}
            >
              {componentCount != null ? componentCount : "—"}
            </DetailLinkedTableTd>
            <DetailLinkedTableTd
              narrow
              className={detailLinkedTableCellClassName({
                align: "right",
                narrow: true,
                cellClassName: "tabular-nums",
              })}
            >
              {moneyDisplay(sellPrice)}
            </DetailLinkedTableTd>
          </DetailLinkedTableRow>
        );
      })}
    </DetailLinkedTable>
  );
}

export function GroupSubgroupsTab({ detail }: { detail: Group }) {
  const t = useTranslations("Dashboard.groups");
  const { formatMoneyValue: moneyDisplay } = useOrgCurrency();
  const subgroups = detail.subgroups ?? [];
  const [openId, setOpenId] = React.useState<number | null>(subgroups[0]?.id ?? null);

  React.useEffect(() => {
    setOpenId(detail.subgroups?.[0]?.id ?? null);
  }, [detail.id, detail.subgroups]);

  if (subgroups.length === 0) {
    return (
      <DetailPagePadding>
        <p className="py-6 text-sm text-slate-500 dark:text-slate-400">{t("detail.noSubgroups")}</p>
      </DetailPagePadding>
    );
  }

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionSubgroups")}>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            {subgroups.map((subgroup: GroupSubgroup) => {
              const open = openId === subgroup.id;
              const itemCount = subgroup.items?.length ?? 0;
              return (
                <li key={subgroup.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 sm:px-4"
                    onClick={() => setOpenId(open ? null : subgroup.id)}
                    aria-expanded={open}
                  >
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0 text-slate-400 transition-transform",
                        open && "rotate-90",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {subgroup.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("detail.subgroupItemCount", { count: itemCount })}
                      </p>
                    </div>
                    <DetailEntityLink
                      href={`${routes.dashboard.groups}/${subgroup.id}`}
                      className="shrink-0 text-xs font-medium text-blue-600 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {t("detail.openSubgroup")}
                    </DetailEntityLink>
                  </button>
                  {open ? (
                    <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800 sm:px-4">
                      <ItemsTable items={subgroup.items ?? []} t={t} moneyDisplay={moneyDisplay} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </DetailPanelCard>
      </div>
    </DetailPagePadding>
  );
}
