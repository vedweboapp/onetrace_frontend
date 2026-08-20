"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { updateClient } from "@/features/clients/api/client.api";
import type { Client } from "@/features/clients/types/client.types";
import { resolveClientAddresses } from "@/features/clients/utils/client-form-map";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailAddressBlock } from "@/shared/components/layout/detail-address-block";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import { DetailEntityAddressFields } from "@/shared/components/layout/detail-entity-address-fields";
import {
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageBodyPaddingClassName,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { entityAddressTypeOptions, sortEntityAddressesForDisplay } from "@/shared/form/entity-address-form.util";
import { useDetailPatch } from "@/shared/hooks/use-entity-detail-screen";

export function ClientDetailBody({
  detail,
  dateFmt,
  onSaved,
}: {
  detail: Client;
  dateFmt: Intl.DateTimeFormat;
  /** Refresh detail after a successful quick-edit PATCH. */
  onSaved?: () => void;
}) {
  const t = useTranslations("Dashboard.clients");
  const tMeta = useTranslations("Dashboard.common.detail");
  const tActions = useTranslations("Dashboard.common.actions");
  const addresses = resolveClientAddresses(detail);
  const sortedAddresses = React.useMemo(() => sortEntityAddressesForDisplay(addresses), [addresses]);
  const addressTypeOptions = React.useMemo(() => entityAddressTypeOptions((key) => t(key)), [t]);

  const patchField = useDetailPatch(
    (body: Parameters<typeof updateClient>[1]) => updateClient(detail.id, body),
    { success: t("updatedToast"), error: t("toggleActiveError") },
    onSaved,
  );

  const patchAddresses = useDetailPatch(
    (addressPayloads: Parameters<typeof updateClient>[1]["addresses"]) =>
      updateClient(detail.id, {
        name: detail.name,
        email: detail.email,
        phone: detail.phone ?? "",
        addresses: addressPayloads,
      }),
    { success: t("updatedToast"), error: t("toggleActiveError") },
    onSaved,
  );

  const addressFieldLabels = React.useMemo(
    () => ({
      addressType: t("fields.addressType"),
      addressLine1: t("fields.addressLine1"),
      addressLine2: t("fields.addressLine2"),
      pincode: t("fields.pincode"),
      country: t("fields.country"),
      state: t("fields.stateProvince"),
      city: t("fields.city"),
      primary: t("addresses.primary"),
    }),
    [t],
  );

  return (
    <DetailPagePadding className={detailPageBodyPaddingClassName}>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.panelOverview")} variant="flat">
          <DetailMetricsGrid>
            <DetailEditableField
              label={t("fields.name")}
              value={detail.name}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ name: next })}
            >
              {detail.name}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.email")}
              value={detail.email}
              kind="email"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ email: next })}
            >
              {detail.email}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.phone")}
              value={detail.phone ?? ""}
              kind="tel"
              editAriaLabel={tActions("edit")}
              empty={t("detail.notProvided")}
              onSave={(next) => patchField({ phone: next })}
            >
              {detail.phone?.trim() ? detail.phone : null}
            </DetailEditableField>
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("fields.addresses")} variant="flat">
          {addresses.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>
          ) : (
            <ul className="space-y-0">
              {sortedAddresses.map(({ address: addr, originalIndex, displayIndex }) => (
                <li key={addr.id ?? `${addr.address_type}-${originalIndex}`}>
                  <DetailAddressBlock
                    heading={t("addresses.rowLabel", { index: displayIndex + 1 })}
                    primaryLabel={t("addresses.primary")}
                    isPrimary={Boolean(addr.is_primary)}
                    separated={displayIndex > 0}
                  >
                    <DetailEntityAddressFields
                      address={addr}
                      addressIndex={originalIndex}
                      allAddresses={addresses}
                      labels={addressFieldLabels}
                      addressTypeOptions={addressTypeOptions}
                      addressTypeValue={t(`addressType.${addr.address_type}`)}
                      editAriaLabel={tActions("edit")}
                      line2Empty={t("detail.addressLine2Empty")}
                      onSaveAddresses={patchAddresses}
                    />
                  </DetailAddressBlock>
                </li>
              ))}
            </ul>
          )}
        </DetailPanelCard>

        <DetailSystemMetadataSection
          createdAt={detail.created_at}
          modifiedAt={detail.modified_at}
          dateFmt={dateFmt}
          createdBy={detail.created_by}
          modifiedBy={detail.modified_by}
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
