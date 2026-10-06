"use client";

import { useTranslations } from "next-intl";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import type { LabourType } from "@/features/labour-types/types/labour-type.types";
import { parseLabourNumber } from "@/features/labour-types/utils/labour-type-numbers.util";
import { updateLabourType } from "@/features/labour-types/api/labour-type.api";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import {
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
  const tActions = useTranslations("Dashboard.common.actions");
  const { formatMoneyValue: moneyDisplay } = useOrgCurrency();
  const patchField = useDetailPatch(
    (body: Parameters<typeof updateLabourType>[1]) => updateLabourType(detail.id, body),
    { success: t("updatedToast"), error: t("saveError") },
    onSaved,
  );

  const costRate = parseLabourNumber(detail.default_cost_rate);
  const markup = parseLabourNumber(detail.default_markup);
  const sellPrice = parseLabourNumber(detail.default_sell_price);

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionDetails")}>
          <DetailMetricsGrid>
            <DetailEditableField
              label={t("fields.name")}
              value={detail.name}
              kind="text"
              required
              requiredMessage={t("validation.name")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ name: next.trim() })}
            >
              {detail.name?.trim() ? detail.name : null}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.description")}
              value={detail.description ?? ""}
              kind="text"
              multiline
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ description: next })}
            >
              {detail.description?.trim() ? detail.description : null}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.costRate")}
              value={String(costRate)}
              kind="money"
              required
              requiredMessage={t("validation.costRate")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => {
                const n = parseOrgMoneyInput(next, getOrgCurrencySettings());
                if (!Number.isFinite(n) || n < 0) throw new Error("Invalid number");
                return patchField({ default_cost_rate: n });
              }}
            >
              <span className="tabular-nums">{moneyDisplay(costRate)}</span>
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.markup")}
              value={String(markup)}
              kind="text"
              required
              requiredMessage={t("validation.markup")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => {
                const n = parseLabourNumber(next);
                if (!Number.isFinite(n) || n < 0) throw new Error("Invalid number");
                return patchField({ default_markup: n });
              }}
            >
              <span className="tabular-nums">{`${markup}%`}</span>
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.sellPrice")}
              value={String(sellPrice)}
              kind="money"
              required
              requiredMessage={t("validation.sellPrice")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => {
                const n = parseOrgMoneyInput(next, getOrgCurrencySettings());
                if (!Number.isFinite(n) || n < 0) throw new Error("Invalid number");
                return patchField({ default_sell_price: n });
              }}
            >
              <span className="tabular-nums">{moneyDisplay(sellPrice)}</span>
            </DetailEditableField>
          </DetailMetricsGrid>
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
