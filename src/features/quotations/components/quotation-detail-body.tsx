"use client";

import { useTranslations } from "next-intl";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";
import {
  DetailMetricCard,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { ActiveStatusBadge } from "@/shared/ui";

type Props = {
  detail: QuotationDetail;
  customerName?: string;
  siteName?: string;
  dateFmt: Intl.DateTimeFormat;
  dueFmt: Intl.DateTimeFormat;
};

function formatUserRef(v: string | number | null | undefined): string {
  if (v == null) return "—";
  if (typeof v === "number") return `#${v}`;
  const s = String(v).trim();
  return s.length > 0 ? s : "—";
}

export function QuotationDetailBody({ detail, customerName, siteName, dateFmt, dueFmt }: Props) {
  const t = useTranslations("Dashboard.quotations");

  const projectLabel =
    detail.project && typeof detail.project === "object" ? detail.project.name : `#${String(detail.project ?? "")}`;

  const levelsLabel =
    detail.levels?.length > 0
      ? detail.select_all_levels
        ? t("detail.allLevelsSelected")
        : detail.levels.map((l) => l.name).join(", ")
      : "—";

  const techLabel =
    detail.technicians?.length > 0 ? detail.technicians.map((id) => `#${id}`).join(", ") : "—";

  const tagsLabel = detail.tags?.length > 0 ? detail.tags.map((id) => `#${id}`).join(", ") : "—";

  const dueLabel = detail.due_date
    ? dueFmt.format(new Date(`${detail.due_date}T12:00:00`))
    : "—";

  const createdByUser =
    detail.created_by && typeof detail.created_by === "object" ? detail.created_by : null;

  const desc = detail.description?.trim() ?? "";

  function quoteStatusLabel(code: string) {
    const c = code.toLowerCase();
    if (c === "draft") return t("quoteStatus.draft");
    if (c === "sent") return t("quoteStatus.sent");
    if (c === "accepted") return t("quoteStatus.accepted");
    if (c === "rejected") return t("quoteStatus.rejected");
    return code;
  }

  return (
    <DetailPagePadding>
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <DetailPanelCard title={t("detail.sectionOverview")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailMetricCard label={t("fields.quoteName")}>{detail.quote_name}</DetailMetricCard>
              <DetailMetricCard label={t("fields.customer")}>{customerName ?? `#${detail.customer}`}</DetailMetricCard>
              <DetailMetricCard label={t("fields.site")}>{siteName ?? `#${detail.site}`}</DetailMetricCard>
              <DetailMetricCard label={t("fields.project")}>{projectLabel}</DetailMetricCard>
              <DetailMetricCard label={t("fields.orderNumber")}>{detail.order_number?.trim() || "—"}</DetailMetricCard>
              <DetailMetricCard label={t("fields.dueDate")}>{dueLabel}</DetailMetricCard>
              <DetailMetricCard label={t("table.status")}>{quoteStatusLabel(detail.status)}</DetailMetricCard>
            </div>
          </DetailPanelCard>

          <DetailPanelCard title={t("detail.sectionPeople")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailMetricCard label={t("fields.salesperson")}>{formatUserRef(detail.salesperson)}</DetailMetricCard>
              <DetailMetricCard label={t("fields.projectManager")}>{formatUserRef(detail.project_manager)}</DetailMetricCard>
              <DetailMetricCard label={t("fields.primaryContact")}>
                {detail.primary_customer_contact != null ? `#${detail.primary_customer_contact}` : "—"}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.additionalContact")}>
                {detail.additional_customer_contact != null ? `#${detail.additional_customer_contact}` : "—"}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.siteContact")}>
                {detail.site_contact != null ? `#${detail.site_contact}` : "—"}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.technicians")}>{techLabel}</DetailMetricCard>
            </div>
          </DetailPanelCard>

          <DetailPanelCard title={t("detail.sectionProject")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailMetricCard label={t("fields.levels")}>{levelsLabel}</DetailMetricCard>
              <DetailMetricCard label={t("fields.tags")}>{tagsLabel}</DetailMetricCard>
            </div>
          </DetailPanelCard>
        </div>

        <div className="space-y-5">
          <DetailPanelCard title={t("fields.description")}>
            {desc ? (
              <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">{desc}</p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.noDescription")}</p>
            )}
          </DetailPanelCard>

          <DetailPanelCard title={t("detail.sectionRecord")}>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">{t("fields.status")}</span>
                <ActiveStatusBadge
                  active={detail.is_active}
                  label={detail.is_active ? t("status.active") : t("status.inactive")}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">{t("fields.createdAt")}</span>
                <span className="font-medium">{dateFmt.format(new Date(detail.created_at))}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">{t("fields.updatedAt")}</span>
                <span className="font-medium">{dateFmt.format(new Date(detail.modified_at))}</span>
              </div>
            </div>
          </DetailPanelCard>

          {createdByUser ? (
            <DetailPanelCard title={t("fields.createdBy")}>
              <span className="block font-medium">{createdByUser.username}</span>
              <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{createdByUser.email}</span>
            </DetailPanelCard>
          ) : null}
        </div>
      </div>
    </DetailPagePadding>
  );
}
