"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Item } from "@/features/items/types/item.types";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
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
  const tUser = useTranslations("Dashboard.common.user");

  const groupId = typeof detail.group === "number" && Number.isFinite(detail.group) && detail.group > 0 ? detail.group : null;

  return (
    <DetailPagePadding>
      <div className="space-y-3.5">
        <DetailPanelCard title={t("detail.sectionOverview")}>
        
          <DetailMetricsGrid className="mt-4 lg:grid-cols-2">
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
            <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400">{t("detail.components")}</p>
            {detail.components && detail.components.length > 0 ? (
              <ul className="mt-3 grid grid-cols-1 gap-3">
                {detail.components.map((component, index) => (
                  <li
                    key={`${component.child_item}-${index}`}
                    className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50/50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/35"
                  >
                    <Link
                      href={`${routes.dashboard.items}/${component.child_item}`}
                      className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                    >
                      {t("detail.componentItem")} #{component.child_item}
                    </Link>
                    <span className="shrink-0 rounded-md bg-slate-200/90 px-2 py-1 text-xs font-semibold tabular-nums text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                      {t("detail.componentQty")} {component.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("detail.noComponents")}</p>
            )}
          </DetailPanelCard>
        ) : null}

        <DetailPanelCard title={t("detail.sectionRecord")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailMetricCard label={t("detail.createdAt")}>
              <span className="break-words tabular-nums">{dateFmt.format(new Date(detail.created_at))}</span>
            </DetailMetricCard>
            <DetailMetricCard label={t("detail.updatedAt")}>
              <span className="break-words tabular-nums">{dateFmt.format(new Date(detail.modified_at))}</span>
            </DetailMetricCard>
          </div>
        </DetailPanelCard>

        {detail.created_by ? (
          <DetailPanelCard title={t("detail.sectionCreatedBy")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(() => {
                const uname = detail.created_by!.username?.trim() ?? "";
                const em = detail.created_by!.email?.trim() ?? "";
                const nodes: React.ReactNode[] = [];
                if (em && (!uname || uname === em)) {
                  nodes.push(
                    <DetailMetricCard key="e" label={tUser("email")}>
                      <a
                        href={`mailto:${em}`}
                        className="break-all font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                      >
                        {em}
                      </a>
                    </DetailMetricCard>,
                  );
                } else {
                  if (uname) {
                    nodes.push(
                      <DetailMetricCard key="u" label={tUser("username")}>
                        {uname}
                      </DetailMetricCard>,
                    );
                  }
                  if (em && uname !== em) {
                    nodes.push(
                      <DetailMetricCard key="e" label={tUser("email")}>
                        <a
                          href={`mailto:${em}`}
                          className="break-all font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                        >
                          {em}
                        </a>
                      </DetailMetricCard>,
                    );
                  }
                }
                if (!uname && !em) {
                  nodes.push(
                    <DetailMetricCard key="id" label={tUser("username")}>
                      #{detail.created_by!.id}
                    </DetailMetricCard>,
                  );
                }
                return nodes;
              })()}
            </div>
          </DetailPanelCard>
        ) : null}

        {detail.modified_by ? (
          <DetailPanelCard title={t("detail.sectionModifiedBy")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(() => {
                const uname = detail.modified_by!.username?.trim() ?? "";
                const em = detail.modified_by!.email?.trim() ?? "";
                const nodes: React.ReactNode[] = [];
                if (em && (!uname || uname === em)) {
                  nodes.push(
                    <DetailMetricCard key="e" label={tUser("email")}>
                      <a
                        href={`mailto:${em}`}
                        className="break-all font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                      >
                        {em}
                      </a>
                    </DetailMetricCard>,
                  );
                } else {
                  if (uname) {
                    nodes.push(
                      <DetailMetricCard key="u" label={tUser("username")}>
                        {uname}
                      </DetailMetricCard>,
                    );
                  }
                  if (em && uname !== em) {
                    nodes.push(
                      <DetailMetricCard key="e" label={tUser("email")}>
                        <a
                          href={`mailto:${em}`}
                          className="break-all font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                        >
                          {em}
                        </a>
                      </DetailMetricCard>,
                    );
                  }
                }
                if (!uname && !em) {
                  nodes.push(
                    <DetailMetricCard key="id" label={tUser("username")}>
                      #{detail.modified_by!.id}
                    </DetailMetricCard>,
                  );
                }
                return nodes;
              })()}
            </div>
          </DetailPanelCard>
        ) : null}
      </div>
    </DetailPagePadding>
  );
}
