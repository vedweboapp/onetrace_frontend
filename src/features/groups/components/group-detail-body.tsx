"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Group } from "@/features/groups/types/group.types";
import { routes } from "@/shared/config/routes";
import {
  DetailMetricCard,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { ActiveStatusBadge } from "@/shared/ui";

export function GroupDetailBody({
  detail,
  dateFmt,
}: {
  detail: Group;
  dateFmt: Intl.DateTimeFormat;
}) {
  const t = useTranslations("Dashboard.groups");
  const tUser = useTranslations("Dashboard.common.user");

  return (
    <DetailPagePadding>
      <div className="space-y-3.5">
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailMetricCard label={t("table.status")}>
              <ActiveStatusBadge
                active={detail.is_active}
                label={detail.is_active ? t("statusActive") : t("statusInactive")}
              />
            </DetailMetricCard>
            <DetailMetricCard label={t("detail.metaGroupId")}>
              <span className="tabular-nums text-slate-700 dark:text-slate-200">#{detail.id}</span>
            </DetailMetricCard>
          </div>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionItems")}>
          <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400">{t("detail.items")}</p>
          {detail.items && detail.items.length > 0 ? (
            <ul className="mt-3 grid grid-cols-1 gap-3">
              {detail.items.map((entry, index) => (
                <li
                  key={`${entry.id ?? index}-${entry.item}`}
                  className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50/50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/35"
                >
                  <Link
                    href={`${routes.dashboard.compositeItems}/${entry.item}`}
                    className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                  >
                    {entry.item_name ?? `#${entry.item}`}
                  </Link>
                  <span className="shrink-0 rounded-md bg-slate-200/90 px-2 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                    {entry.abbreviation || "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("detail.noItems")}</p>
          )}
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionRecord")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailMetricCard label={t("fields.createdAt")}>
              <span className="break-words tabular-nums">{dateFmt.format(new Date(detail.created_at))}</span>
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.updatedAt")}>
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
