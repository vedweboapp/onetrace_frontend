"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { routes } from "@/shared/config/routes";
import { DetailFormattedAddress, hasDetailAddress } from "@/shared/components/layout/detail-formatted-address";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { ActiveStatusBadge } from "@/shared/ui";

function projectSiteListRows(detail: Project): { id: number; label: string; isActive?: boolean }[] {
  const sites = detail.sites;
  if (!Array.isArray(sites) || sites.length === 0) return [];
  const rows: { id: number; label: string; isActive?: boolean }[] = [];
  for (const entry of sites) {
    if (typeof entry === "number" && Number.isFinite(entry) && entry > 0) {
      rows.push({ id: entry, label: `#${entry}` });
    } else if (entry && typeof entry === "object" && typeof entry.id === "number") {
      const name = entry.site_name?.trim();
      rows.push({
        id: entry.id,
        label: name || `#${entry.id}`,
        isActive: typeof entry.is_active === "boolean" ? entry.is_active : undefined,
      });
    }
  }
  return rows;
}

export function ProjectDetailBody({
  detail,
  dateFmt,
  dateOnlyFmt,
  clientName,
}: {
  detail: Project;
  dateFmt: Intl.DateTimeFormat;
  dateOnlyFmt: Intl.DateTimeFormat;
  clientName: string | null;
}) {
  const t = useTranslations("Dashboard.projects");
  const tUser = useTranslations("Dashboard.common.user");
  const clientId = getProjectClientId(detail);

  const start = detail.start_date?.slice(0, 10) ?? "";
  const end = detail.end_date?.slice(0, 10) ?? "";
  const siteRows = projectSiteListRows(detail);

  const addressParts = {
    line1: detail.address_line_1,
    line2: detail.address_line_2,
    city: detail.city,
    state: detail.state,
    pincode: detail.pincode,
    country: detail.country,
  };
  const showAddress = hasDetailAddress(addressParts);

  return (
    <DetailPagePadding>
      <div className="space-y-3.5">
        <DetailPanelCard title={t("detail.sectionOverview")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailMetricCard label={t("fields.client")}>
              {clientId ? (
                <Link
                  href={`${routes.dashboard.clients}/${clientId}`}
                  className="break-words font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {clientName ?? `#${clientId}`}
                </Link>
              ) : (
                <span className="break-words text-slate-700 dark:text-slate-200">{clientName ?? "—"}</span>
              )}
            </DetailMetricCard>
            <DetailMetricCard label={t("detail.metaProjectId")}>
              <span className="tabular-nums">{detail.id}</span>
            </DetailMetricCard>
            <DetailMetricCard label={t("table.status")}>
              <div className="flex flex-wrap items-center gap-2">
                <ActiveStatusBadge
                  active={detail.is_active}
                  label={detail.is_active ? t("status.active") : t("status.inactive")}
                />
                {detail.status ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {detail.status}
                  </span>
                ) : null}
              </div>
            </DetailMetricCard>
          </div>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.panelDescription")}>
          {detail.description?.trim() ? (
            <div className="rounded-md border border-slate-100 bg-slate-50/60 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/35">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {detail.description}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">—</p>
          )}
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.panelTimeline")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailMetricCard label={t("fields.startDate")}>
              {start ? dateOnlyFmt.format(new Date(`${start}T12:00:00`)) : "—"}
            </DetailMetricCard>
            <DetailMetricCard label={t("fields.endDate")}>
              {end ? dateOnlyFmt.format(new Date(`${end}T12:00:00`)) : "—"}
            </DetailMetricCard>
          </div>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionAddress")}>
          {showAddress ? (
            <DetailFormattedAddress
              line1={addressParts.line1}
              line2={addressParts.line2}
              city={addressParts.city}
              state={addressParts.state}
              pincode={addressParts.pincode}
              country={addressParts.country}
              emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">—</p>}
            />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>
          )}
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.panelSites")}>
          {siteRows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.sitesEmpty")}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3">
              {siteRows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-md border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/35"
                >
                  <Link
                    href={`${routes.dashboard.sites}/${row.id}`}
                    className="block min-w-0 font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                  >
                    <span className="break-words">{row.label}</span>
                  </Link>
                  {typeof row.isActive === "boolean" ? (
                    <div className="mt-2">
                      <ActiveStatusBadge
                        active={row.isActive}
                        label={row.isActive ? t("status.active") : t("status.inactive")}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
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
          <DetailPanelCard title={t("fields.createdBy")}>
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
      </div>
    </DetailPagePadding>
  );
}
