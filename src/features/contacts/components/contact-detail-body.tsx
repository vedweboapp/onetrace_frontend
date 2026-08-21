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
  DetailActiveStatusField,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageBodyPaddingClassName,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { useDetailPatch } from "@/shared/hooks/use-entity-detail-screen";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";

type Props = {
  detail: Contact;
  clientName?: string;
  vendorName?: string;
  clientOptions: CheckmarkSelectOption[];
  vendorOptions: CheckmarkSelectOption[];
  contactTypeOptions: CheckmarkSelectOption[];
  dateFmt: Intl.DateTimeFormat;
  onSaved?: () => void;
};

export function ContactDetailBody({
  detail,
  clientName,
  vendorName,
  clientOptions,
  vendorOptions,
  contactTypeOptions,
  dateFmt,
  onSaved,
}: Props) {
  const t = useTranslations("Dashboard.contacts");
  const tMeta = useTranslations("Dashboard.common.detail");
  const tActions = useTranslations("Dashboard.common.actions");
  const contactType = getContactType(detail);
  const clientId = getContactClientId(detail);
  const vendorId = getContactVendorId(detail);

  const patchField = useDetailPatch(
    (body: Parameters<typeof updateContact>[1]) => updateContact(detail.id, body),
    { success: t("updatedToast"), error: t("toggleActiveError") },
    onSaved,
  );

  return (
    <DetailPagePadding className={detailPageBodyPaddingClassName}>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.sectionOverview")} variant="flat">
          <DetailMetricsGrid>
            <DetailEditableField
              label={t("fields.contactType")}
              value={contactType}
              kind="select"
              options={contactTypeOptions}
              required
              requiredMessage={t("validation.contactType")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => {
                const type = next === "vendor" ? "vendor" : "client";
                return patchField(
                  type === "client"
                    ? { contact_type: type, client: clientId ?? undefined, vendor: undefined }
                    : { contact_type: type, vendor: vendorId ?? undefined, client: undefined },
                );
              }}
            >
              {contactType === "vendor" ? t("tabs.vendor") : t("tabs.client")}
            </DetailEditableField>

            {contactType === "vendor" ? (
              <DetailEditableField
                label={t("fields.vendor")}
                value={vendorId != null ? String(vendorId) : ""}
                kind="select"
                options={vendorOptions}
                selectSearchable
                required
                requiredMessage={t("validation.vendor")}
                editAriaLabel={tActions("edit")}
                onSave={(next) => patchField({ vendor: Number(next), contact_type: "vendor" })}
              >
                {vendorId ? (
                  <DetailEntityLink href={`${routes.dashboard.vendors}/${vendorId}`}>
                    {vendorName ?? "—"}
                  </DetailEntityLink>
                ) : (
                  vendorName ?? "—"
                )}
              </DetailEditableField>
            ) : (
              <DetailEditableField
                label={t("fields.client")}
                value={clientId != null ? String(clientId) : ""}
                kind="select"
                options={clientOptions}
                selectSearchable
                required
                requiredMessage={t("validation.client")}
                editAriaLabel={tActions("edit")}
                onSave={(next) => patchField({ client: Number(next), contact_type: "client" })}
              >
                {clientId ? (
                  <DetailEntityLink href={`${routes.dashboard.clients}/${clientId}`}>
                    {clientName ?? "—"}
                  </DetailEntityLink>
                ) : (
                  clientName ?? "—"
                )}
              </DetailEditableField>
            )}

            <DetailEditableField
              label={t("fields.name")}
              value={detail.name}
              kind="text"
              required
              requiredMessage={t("validation.name")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ name: next })}
            >
              {detail.name}
            </DetailEditableField>

            <DetailEditableField
              label={t("fields.phone")}
              value={detail.phone ?? ""}
              kind="tel"
              required
              requiredMessage={t("validation.phoneInvalid")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ phone: next })}
            >
              {detail.phone?.trim() ? detail.phone : null}
            </DetailEditableField>

            <DetailEditableField
              label={t("fields.email")}
              value={detail.email}
              kind="email"
              required
              requiredMessage={t("validation.email")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ email: next })}
            >
              {detail.email}
            </DetailEditableField>

            <DetailActiveStatusField
              label={t("fields.status")}
              isActive={detail.is_active}
              activeLabel={t("status.active")}
              inactiveLabel={t("status.inactive")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ is_active: next })}
            />
          </DetailMetricsGrid>
        </DetailPanelCard>

        <DetailPanelCard title={t("detail.sectionAddress")} variant="flat">
          <DetailMetricsGrid>
            <DetailEditableField
              label={t("fields.addressLine1")}
              value={detail.address_line_1 ?? ""}
              kind="text"
              required
              requiredMessage={t("validation.addressLine1")}
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
              requiredMessages={{
                country: t("validation.country"),
                state: t("validation.state"),
                city: t("validation.city"),
              }}
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
              required
              requiredMessage={t("validation.pincode")}
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
