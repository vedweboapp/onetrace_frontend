"use client";

import { useTranslations } from "next-intl";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import type { QrCode } from "@/features/qr-codes/types/qr-code.types";
import {
  getQrAssignedJobId,
  getQrAssignedPinHref,
  getQrAssignedPinId,
  qrAssignedLabel,
} from "@/features/qr-codes/utils/qr-code-assignment.util";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { QrCodeImage } from "@/features/qr-codes/components/qr-code-image";
import { ActiveStatusBadge } from "@/shared/ui";

function formatOptionalDate(value: string | null, dateFmt: Intl.DateTimeFormat): string {
  if (!value?.trim()) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : dateFmt.format(d);
}

type Props = {
  detail: QrCode;
  dateFmt: Intl.DateTimeFormat;
};

export function QrCodeDetailBody({ detail, dateFmt }: Props) {
  const t = useTranslations("Dashboard.qrCodes");
  const tMeta = useTranslations("Dashboard.common.detail");
  const assigned = detail.status === "assigned" || detail.is_assigned;
  const pinHref = getQrAssignedPinHref(detail);
  const jobId = getQrAssignedJobId(detail);
  const pinId = getQrAssignedPinId(detail);
  const assignedLabel = qrAssignedLabel(detail);

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionQr")}>
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            {detail.public_url ? (
              <QrCodeImage value={detail.public_url} size={192} />
            ) : detail.qr_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.qr_image}
                alt={detail.qr_code_id}
                className="size-48 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-2 dark:border-slate-700 dark:bg-slate-950"
              />
            ) : null}
            <div className="min-w-0 space-y-1">
              <p className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100">{detail.qr_code_id}</p>
              <ActiveStatusBadge
                active={assigned}
                label={assigned ? t("status.assigned") : t("status.notAssigned")}
              />
            </div>
          </div>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionDetails")}>
          <DetailMetricsGrid>
            <DetailMetricCard label={t("table.batchNumber")}>
              <span className="font-mono">
                {detail.batch_detail?.batch_number?.trim() || "—"}
              </span>
            </DetailMetricCard>
            <DetailMetricCard label={t("detail.assignedId")}>
              {pinHref ? (
                <DetailEntityLink href={pinHref}>
                  {assignedLabel}
                  {jobId != null && pinId != null ? (
                    <span className="ml-1 text-slate-500 dark:text-slate-400">
                      ({t("detail.assignedPinHint", { jobId, pinId })})
                    </span>
                  ) : null}
                </DetailEntityLink>
              ) : (
                <span>{t("detail.notAssigned")}</span>
              )}
            </DetailMetricCard>
            <DetailMetricCard label={t("table.lastScanned")}>
              <span>{formatOptionalDate(detail.last_scanned_at, dateFmt)}</span>
            </DetailMetricCard>
            <DetailMetricCard label={t("table.scanCount")}>
              <span className="tabular-nums">{detail.scan_count}</span>
            </DetailMetricCard>
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailSystemMetadataSection
          createdAt={detail.created_at}
          modifiedAt={detail.modified_at ?? null}
          dateFmt={dateFmt}
          createdBy={detail.created_by ?? null}
          modifiedBy={detail.modified_by ?? null}
          labels={{
            sectionTitle: tMeta("systemMetadata"),
            createdAt: t("fields.createdAt"),
            updatedAt: t("fields.updatedAt"),
            createdBy: t("fields.createdBy"),
            modifiedBy: tMeta("modifiedBy"),
            notModifiedYet: tMeta("notModifiedYet"),
          }}
        />
      </div>
    </DetailPagePadding>
  );
}
