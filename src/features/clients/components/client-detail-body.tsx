"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { updateClient } from "@/features/clients/api/client.api";
import type { Client } from "@/features/clients/types/client.types";
import { resolveClientAddresses } from "@/features/clients/utils/client-form-map";
import { DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import { DetailEntityAddressFields } from "@/shared/components/layout/detail-entity-address-fields";
import {
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { ActiveStatusBadge } from "@/shared/ui";

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

  const statusOptions = React.useMemo(
    () => [
      { value: "true", label: t("status.active") },
      { value: "false", label: t("status.inactive") },
    ],
    [t],
  );

  async function patchField(body: Parameters<typeof updateClient>[1]) {
    try {
      await updateClient(detail.id, body);
      toastSuccess(t("updatedToast"));
      onSaved?.();
    } catch (error) {
      toastApiError(error, t("toggleActiveError"));
      throw error;
    }
  }

  async function patchAddresses(addressPayloads: Parameters<typeof updateClient>[1]["addresses"]) {
    try {
      await updateClient(detail.id, {
        name: detail.name,
        email: detail.email,
        phone: detail.phone ?? "",
        addresses: addressPayloads,
      });
      toastSuccess(t("updatedToast"));
      onSaved?.();
    } catch (error) {
      toastApiError(error, t("toggleActiveError"));
      throw error;
    }
  }

  const addressFieldLabels = React.useMemo(
    () => ({
      addressLine1: t("fields.addressLine1"),
      addressLine2: t("fields.addressLine2"),
      pincode: t("fields.pincode"),
      country: t("fields.country"),
      state: t("fields.stateProvince"),
      city: t("fields.city"),
    }),
    [t],
  );

  return (
    <DetailPagePadding className="!px-0 !py-0 sm:!px-0 sm:!py-0">
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
              label={t("detail.metaStatus")}
              value={detail.is_active ? "true" : "false"}
              kind="select"
              options={statusOptions}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ is_active: next === "true" })}
            >
              <ActiveStatusBadge
                active={detail.is_active}
                label={detail.is_active ? t("status.active") : t("status.inactive")}
              />
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
            <ul className="space-y-6">
              {addresses.map((addr, index) => (
                <li key={addr.id ?? `${addr.address_type}-${index}`} className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t(`addressType.${addr.address_type}`)}
                    </span>
                    {addr.is_primary ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {t("addresses.primary")}
                      </span>
                    ) : null}
                  </div>
                  <DetailEntityAddressFields
                    address={addr}
                    addressIndex={index}
                    allAddresses={addresses}
                    labels={addressFieldLabels}
                    editAriaLabel={tActions("edit")}
                    line2Empty={t("detail.addressLine2Empty")}
                    onSaveAddresses={patchAddresses}
                  />
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
