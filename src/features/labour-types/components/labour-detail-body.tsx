"use client";

import { useTranslations } from "next-intl";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import type { LabourType } from "@/features/labour-types/types/labour-type.types";
import { parseLabourNumber } from "@/features/labour-types/utils/labour-type-numbers.util";
import { updateLabourType } from "@/features/labour-types/api/labour-type.api";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { useDetailPatch } from "@/shared/hooks/use-entity-detail-screen";
import { useOrgCurrency } from "@/shared/money/use-org-currency";
import { parseOrgMoneyInput } from "@/shared/money/format-money.util";
import { getOrgCurrencySettings } from "@/shared/money/org-currency.store";

export function LabourDetailBody({
  detail,
  dateFmt,
  onSaved,
}: {
  detail: LabourType;
  dateFmt: Intl.DateTimeFormat;
  onSaved?: () => void;
}) {
  const t = useTranslations("Dashboard.labours");
  const tMeta = useTranslations("Dashboard.common.detail");
  const { formatMoneyValue: moneyDisplay } = useOrgCurrency();
  const patchField = useDetailPatch(
    (body: Parameters<typeof updateLabourType>[1]) => updateLabourType(detail.id, body),
    { success: t("updatedToast"), error: t("saveError") },
    onSaved,
  );

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailMetricsGrid>
          <DetailMetricCard label={t("table.costRate")}>
            {moneyDisplay(parseLabourNumber(detail.default_cost_rate))}
          </DetailMetricCard>
          <DetailMetricCard label={t("table.markup")}>
            {`${parseLabourNumber(detail.default_markup)}%`}
          </DetailMetricCard>
          <DetailMetricCard label={t("table.sellPrice")}>
            {moneyDisplay(parseLabourNumber(detail.default_sell_price))}
          </DetailMetricCard>
        </DetailMetricsGrid>
        <DetailPanelCard title={t("detail.sectionDetails")}>
          <div className="space-y-4">
            <DetailEditableField
              label={t("fields.name")}
              value={detail.name}
              onSave={(next) => patchField({ name: next.trim() })}
            />
            <DetailEditableField
              label={t("fields.description")}
              value={detail.description ?? ""}
              onSave={(next) => patchField({ description: next })}
              multiline
            />
            <DetailEditableField
              label={t("fields.costRate")}
              value={String(parseLabourNumber(detail.default_cost_rate))}
              onSave={(next) => {
                const n = parseOrgMoneyInput(next, getOrgCurrencySettings());
                if (!Number.isFinite(n) || n < 0) throw new Error("Invalid number");
                return patchField({ default_cost_rate: n });
              }}
            />
            <DetailEditableField
              label={t("fields.markup")}
              value={String(parseLabourNumber(detail.default_markup))}
              onSave={(next) => {
                const n = Number(String(next).trim());
                if (!Number.isFinite(n) || n < 0) throw new Error("Invalid number");
                return patchField({ default_markup: n });
              }}
            />
            <DetailEditableField
              label={t("fields.sellPrice")}
              value={String(parseLabourNumber(detail.default_sell_price))}
              onSave={(next) => {
                const n = parseOrgMoneyInput(next, getOrgCurrencySettings());
                if (!Number.isFinite(n) || n < 0) throw new Error("Invalid number");
                return patchField({ default_sell_price: n });
              }}
            />
          </div>
        </DetailPanelCard>
        <DetailSystemMetadataSection
          createdAt={detail.created_at}
          modifiedAt={detail.modified_at}
          createdBy={detail.created_by}
          modifiedBy={detail.modified_by}
          dateFmt={dateFmt}
          labels={{
            sectionTitle: tMeta("systemMetadata"),
            createdAt: tMeta("createdAt"),
            updatedAt: tMeta("updatedAt"),
            createdBy: tMeta("createdBy"),
            modifiedBy: tMeta("modifiedBy"),
            notModifiedYet: tMeta("notModifiedYet"),
          }}
        />
      </div>
    </DetailPagePadding>
  );
}
