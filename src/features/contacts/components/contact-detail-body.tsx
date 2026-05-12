"use client";

import { useTranslations } from "next-intl";
import type { Contact } from "@/features/contacts/types/contact.types";
import { DetailFormattedAddress } from "@/shared/components/layout/detail-formatted-address";
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
  const clientId =
    typeof detail.client === "number"
      ? detail.client
      : typeof detail.client?.id === "number"
        ? detail.client.id
        : null;
  const phoneRaw = detail.phone?.trim() ?? "";

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
                {clientName ?? (clientId ? `#${clientId}` : "—")}
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
            <DetailFormattedAddress
              line1={detail.address_line_1}
              line2={detail.address_line_2}
              city={detail.city}
              state={detail.state}
              pincode={detail.pincode}
              country={detail.country}
              line2Fallback={t("detail.addressLine2Empty")}
              emptyMessage={<p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>}
            />
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
