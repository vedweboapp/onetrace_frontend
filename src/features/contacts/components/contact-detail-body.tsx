"use client";

import { useTranslations } from "next-intl";
import type { Contact } from "@/features/contacts/types/contact.types";
import {
  DetailMetricCard,
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { ActiveStatusBadge } from "@/shared/ui";

type Props = {
  detail: Contact;
  clientName?: string;
  dateFmt: Intl.DateTimeFormat;
};

export function ContactDetailBody({ detail, clientName, dateFmt }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const line1 = detail.address_line_1?.trim() ?? "";
  const line2 = detail.address_line_2?.trim() ?? "";
  const phoneRaw = detail.phone?.trim() ?? "";
  const hasAddress = !!(
    line1 ||
    line2 ||
    detail.city?.trim() ||
    detail.state?.trim() ||
    detail.country?.trim() ||
    detail.pincode?.trim()
  );

  const createdByUser =
    detail.created_by && typeof detail.created_by === "object" ? detail.created_by : null;

  return (
    <DetailPagePadding>
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <DetailPanelCard title={t("detail.sectionOverview")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailMetricCard label={t("fields.name")}>{detail.name}</DetailMetricCard>
              <DetailMetricCard label={t("fields.client")}>
                {clientName ?? `#${detail.client}`}
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.email")}>
                <a
                  href={`mailto:${detail.email}`}
                  className="break-all font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {detail.email}
                </a>
              </DetailMetricCard>
              <DetailMetricCard label={t("fields.phone")}>
                {phoneRaw ? (
                  <a
                    href={`tel:${phoneRaw.replace(/\s/g, "")}`}
                    className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                  >
                    {phoneRaw}
                  </a>
                ) : (
                  "—"
                )}
              </DetailMetricCard>
            </div>
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
        </div>

        <div className="space-y-5">
          <DetailPanelCard title={t("detail.sectionAddress")}>
            {hasAddress ? (
              <div className="space-y-3 text-sm">
                <p className="font-medium text-slate-900 dark:text-slate-100">{line1 || "—"}</p>
                <p className={line2 ? "text-slate-700 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"}>
                  {line2 || t("detail.addressLine2Empty")}
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailMetricCard label={t("fields.city")}>{detail.city?.trim() || "—"}</DetailMetricCard>
                  <DetailMetricCard label={t("fields.stateProvince")}>{detail.state?.trim() || "—"}</DetailMetricCard>
                  <DetailMetricCard label={t("fields.country")}>{detail.country?.trim() || "—"}</DetailMetricCard>
                  <DetailMetricCard label={t("fields.pincode")}>{detail.pincode?.trim() || "—"}</DetailMetricCard>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>
            )}
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
