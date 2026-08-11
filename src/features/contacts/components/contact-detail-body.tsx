"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { updateContact } from "@/features/contacts/api/contact.api";
import type { Contact } from "@/features/contacts/types/contact.types";
import {
  getContactClientId,
  getContactType,
  getContactVendorId,
} from "@/features/contacts/utils/contact-nested-fields.util";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import {
  DetailAddressLocationFields,
  detailLocationCountryPayload,
  detailLocationStatePayload,
} from "@/shared/components/layout/detail-address-location-fields";
import { countryIsoFromName } from "@/shared/form/entity-address-form.util";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { ActiveStatusBadge } from "@/shared/ui";

type Props = {
  detail: Contact;
  clientName?: string;
  vendorName?: string;
  dateFmt: Intl.DateTimeFormat;
  /** Refresh detail after a successful quick-edit PATCH. */
  onSaved?: () => void;
};

export function ContactDetailBody({ detail, clientName, vendorName, dateFmt, onSaved }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const tMeta = useTranslations("Dashboard.common.detail");
  const tActions = useTranslations("Dashboard.common.actions");
  const contactType = getContactType(detail);
  const clientId = getContactClientId(detail);
  const vendorId = getContactVendorId(detail);

  const statusOptions = React.useMemo(
    () => [
      { value: "true", label: t("status.active") },
      { value: "false", label: t("status.inactive") },
    ],
    [t],
  );

  async function patchField(body: Parameters<typeof updateContact>[1]) {
    try {
      await updateContact(detail.id, body);
      toastSuccess(t("updatedToast"));
      onSaved?.();
    } catch (error) {
      toastApiError(error, t("toggleActiveError"));
      throw error;
    }
  }

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionOverview")}>
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
              label={t("fields.status")}
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
            <DetailMetricCard label={t("fields.contactType")}>
              {contactType === "vendor" ? t("tabs.vendor") : t("tabs.client")}
            </DetailMetricCard>
            {contactType === "vendor" ? (
              <DetailMetricCard label={t("fields.vendor")}>
                {vendorId ? (
                  <DetailEntityLink
                    href={`${routes.dashboard.vendors}/${vendorId}`}
                    className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                  >
                    {vendorName ?? "—"}
                  </DetailEntityLink>
                ) : (
                  <span>{vendorName ?? "—"}</span>
                )}
              </DetailMetricCard>
            ) : (
              <DetailMetricCard label={t("fields.client")}>
                {clientId ? (
                  <DetailEntityLink
                    href={`${routes.dashboard.clients}/${clientId}`}
                    className="font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                  >
                    {clientName ?? "—"}
                  </DetailEntityLink>
                ) : (
                  <span>{clientName ?? "—"}</span>
                )}
              </DetailMetricCard>
            )}
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
              onSave={(next) => patchField({ phone: next })}
            >
              {detail.phone?.trim() ? detail.phone : null}
            </DetailEditableField>
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionAddress")}>
          <DetailMetricsGrid>
            <DetailEditableField
              label={t("fields.addressLine1")}
              value={detail.address_line_1 ?? ""}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ address_line_1: next })}
            >
              {detail.address_line_1?.trim() ? detail.address_line_1 : null}
            </DetailEditableField>
            <DetailEditableField
              label={t("fields.addressLine2")}
              value={detail.address_line_2 ?? ""}
              kind="text"
              editAriaLabel={tActions("edit")}
              empty="—"
              onSave={(next) => patchField({ address_line_2: next })}
            >
              {detail.address_line_2?.trim() ? detail.address_line_2 : null}
            </DetailEditableField>
            <DetailAddressLocationFields
              country={detail.country}
              state={detail.state}
              city={detail.city}
              labels={{
                country: t("fields.country"),
                state: t("fields.stateProvince"),
                city: t("fields.city"),
              }}
              editAriaLabel={tActions("edit")}
              onSaveCountry={async (countryIso) => {
                await patchField({
                  country: detailLocationCountryPayload(countryIso),
                  state: "",
                  city: "",
                });
              }}
              onSaveState={async (stateIsoOrName) => {
                const iso = countryIsoFromName(detail.country);
                await patchField({
                  state: detailLocationStatePayload(iso, stateIsoOrName) || stateIsoOrName,
                  city: "",
                });
              }}
              onSaveCity={(cityName) => patchField({ city: cityName })}
            />
            <DetailEditableField
              label={t("fields.pincode")}
              value={detail.pincode ?? ""}
              kind="text"
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ pincode: next })}
            >
              {detail.pincode?.trim() ? detail.pincode : null}
            </DetailEditableField>
          </DetailMetricsGrid>
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
