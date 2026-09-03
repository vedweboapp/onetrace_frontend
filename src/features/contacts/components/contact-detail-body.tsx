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
import { formatContactName } from "@/features/contacts/utils/contact-name.util";
import { resolveContactAddresses } from "@/features/contacts/utils/contact-form-map";
import { DetailEntityLink, DetailSystemMetadataSection } from "@/shared/components/entity";
import { DetailEditableField } from "@/shared/components/layout/detail-editable-field";
import { DetailEntityAddressFields } from "@/shared/components/layout/detail-entity-address-fields";
import {
  DetailActiveStatusField,
  DetailMetricsGrid,
  DetailPagePadding,
  DetailPanelCard,
  detailPageBodyPaddingClassName,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { entityAddressTypeOptions, sortEntityAddressesForDisplay } from "@/shared/form/entity-address-form.util";
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

  const addresses = resolveContactAddresses(detail);
  const sortedAddresses = React.useMemo(() => sortEntityAddressesForDisplay(addresses), [addresses]);
  const addressTypeOptions = React.useMemo(() => entityAddressTypeOptions((key) => t(key)), [t]);

  const patchField = useDetailPatch(
    (body: Parameters<typeof updateContact>[1]) => updateContact(detail.id, body),
    { success: t("updatedToast"), error: t("toggleActiveError") },
    onSaved,
  );

  const patchAddresses = useDetailPatch(
    (addressPayloads: Parameters<typeof updateContact>[1]["addresses"]) =>
      updateContact(detail.id, { addresses: addressPayloads }),
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
    }),
    [t],
  );

  const addressRequiredMessages = React.useMemo(
    () => ({
      addressType: t("validation.addressType"),
      addressLine1: t("validation.addressLine1"),
      pincode: t("validation.pincode"),
      country: t("validation.country"),
      state: t("validation.state"),
      city: t("validation.city"),
    }),
    [t],
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
              locked
              requiredMessage={t("validation.contactType")}
              editAriaLabel={tActions("edit")}
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
              label={t("fields.firstName")}
              value={detail.first_name ?? ""}
              kind="text"
              required
              requiredMessage={t("validation.firstName")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ first_name: next })}
            >
              {detail.first_name?.trim() || "—"}
            </DetailEditableField>

            <DetailEditableField
              label={t("fields.lastName")}
              value={detail.last_name ?? ""}
              kind="text"
              required
              requiredMessage={t("validation.lastName")}
              editAriaLabel={tActions("edit")}
              onSave={(next) => patchField({ last_name: next })}
            >
              {detail.last_name?.trim() || "—"}
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
          {addresses.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.addressUnavailable")}</p>
          ) : (
            <div className="space-y-4">
              {sortedAddresses.map(({ address: addr, originalIndex, displayIndex }) => (
                <DetailEntityAddressFields
                  key={addr.id ?? `${addr.address_type}-${originalIndex}`}
                  separated={displayIndex > 0}
                  blockHeading={t("addresses.rowLabel", { number: displayIndex + 1 })}
                  address={addr}
                  addressIndex={originalIndex}
                  allAddresses={addresses}
                  labels={addressFieldLabels}
                  requiredMessages={addressRequiredMessages}
                  addressTypeOptions={addressTypeOptions}
                  addressTypeValue={t(`addressType.${addr.address_type}`)}
                  editAriaLabel={tActions("edit")}
                  line2Empty={t("detail.addressLine2Empty")}
                  onSaveAddresses={patchAddresses}
                />
              ))}
            </div>
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
