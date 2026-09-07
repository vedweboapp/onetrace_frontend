"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Controller, useForm } from "react-hook-form";
import { createContact } from "@/features/contacts/api/contact.api";
import type { Contact } from "@/features/contacts/types/contact.types";
import { createContactFormSchema, type ContactFormValues } from "@/features/contacts/schemas/contact-form-schema";
import {
  emptyContactFormDefaults,
  mapContactFormToPayload,
} from "@/features/contacts/utils/contact-form-map";
import { EntityAddressesFields } from "@/shared/components/form/entity-addresses-fields";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave, mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { usePhoneCountryFromAddresses } from "@/shared/hooks/use-phone-country-from-address";
import {
  AppButton,
  AppModal,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  SurfacePhoneField,
  SurfaceTextField,
} from "@/shared/ui";

const FORM_DOM_ID = "contact-create-form";
export type ContactClientOption = { value: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  clientOptions: ContactClientOption[];
  onSaved: () => void;
  initialClientId?: string;
  onCreated?: (contact: Contact) => void;
  /** When true, client is fixed (e.g. opened from a client detail tab). */
  lockClient?: boolean;
};

export function ContactFormModal({
  open,
  onClose,
  clientOptions,
  onSaved,
  initialClientId,
  onCreated,
  lockClient = false,
}: Props) {
  const t = useTranslations("Dashboard.contacts");
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  const schema = React.useMemo(
    () =>
      createContactFormSchema({
        firstName: t("validation.firstName"),
        lastName: t("validation.lastName"),
        email: t("validation.email"),
        phoneInvalid: t("validation.phoneInvalid"),
        contactType: t("validation.contactType"),
        client: t("validation.client"),
        vendor: t("validation.vendor"),
        addressLine1: t("validation.addressLine1"),
        country: t("validation.country"),
        state: t("validation.state"),
        city: t("validation.city"),
        pincode: t("validation.pincode"),
        addressType: t("validation.addressType"),
        addressesMin: t("validation.addressesMin"),
      }),
    [t],
  );

  const {
    control,
    register,
    reset,
    setValue,
    clearErrors,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyContactFormDefaults(),
  });

  const phoneCountry = usePhoneCountryFromAddresses(control);

  React.useEffect(() => {
    if (!open) return;
    reset({
      ...emptyContactFormDefaults(),
      ...(initialClientId ? { client: initialClientId } : {}),
    });
  }, [open, reset, initialClientId]);

  async function submit(values: ContactFormValues) {
    const payload = mapContactFormToPayload(values);
    if (values.contact_type === "vendor") {
      if (!Number.isFinite(payload.vendor) || (payload.vendor ?? 0) <= 0) {
        toastError(t("validation.vendor"));
        return;
      }
    } else if (!Number.isFinite(payload.client) || (payload.client ?? 0) <= 0) {
      toastError(t("validation.client"));
      return;
    }
    setSaving(true);
    try {
      const created = await createContact(payload);
      toastSuccess(t("createdToast"));
      onCreated?.(created);
      onSaved();
      onClose();
      router.push(
        mergeUrlQueryParam(
          buildEntityDetailHrefAfterSave(routes.dashboard.contacts, created.id, routes.dashboard.contacts),
          "contact_type",
          values.contact_type,
        ),
      );
    } catch (error) {
      reportFormSubmitApiError(error, setError);
    } finally {
      setSaving(false);
    }
  }

  const [localClientOptions, setLocalClientOptions] = React.useState(clientOptions);
  React.useEffect(() => {
    setLocalClientOptions(clientOptions);
  }, [clientOptions]);

  const noClients = !lockClient && localClientOptions.length === 0;

  const clientQuickCreate = useQuickCreate({ kind: "client", addDisabled: lockClient });

  return (
    <AppModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title={t("modal.createTitle")}
      titleId="contact-modal-title"
      closeOnBackdrop={!saving}
      isBusy={saving}
      size="3xl"
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => (!saving ? onClose() : undefined)}>
            {t("modal.cancel")}
          </AppButton>
          <AppButton type="submit" form={FORM_DOM_ID} variant="primary" size="sm" loading={saving} disabled={noClients}>
            {t("modal.save")}
          </AppButton>
        </>
      }
    >
      <>
      <form id={FORM_DOM_ID} className="space-y-6" noValidate onSubmit={handleSubmit(submit)}>
        {noClients ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {t("noClientsHint")}
          </p>
        ) : null}

        <FormFieldRow cols="2">
          <SurfaceTextField
            register={register}
            name="first_name"
            id="contact-first-name"
            label={t("fields.firstName")}
            kind="name"
            required
            autoComplete="given-name"
            error={errors.first_name?.message}
          />
          <SurfaceTextField
            register={register}
            name="last_name"
            id="contact-last-name"
            label={t("fields.lastName")}
            kind="name"
            required
            autoComplete="family-name"
            error={errors.last_name?.message}
          />
          {lockClient ? (
            <FieldGroup label={t("fields.client")} htmlFor="contact-client" required>
              <CheckmarkSelect
                id="contact-client"
                portaled
                listLabel={t("fields.client")}
                options={localClientOptions}
                value={initialClientId ?? ""}
                emptyLabel={t("placeholders.client")}
                locked
                onChange={() => undefined}
              />
            </FieldGroup>
          ) : (
            <FieldGroup label={t("fields.client")} htmlFor="contact-client" required>
              <Controller
                control={control}
                name="client"
                render={({ field }) => (
                  <CheckmarkSelect
                    id="contact-client"
                    portaled
                    searchable
                    listLabel={t("fields.client")}
                    options={localClientOptions}
                    value={field.value}
                    emptyLabel={t("placeholders.client")}
                    disabled={saving || noClients}
                    invalid={!!errors.client}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    onAdd={clientQuickCreate.onAdd}
                    addAriaLabel={clientQuickCreate.addAriaLabel}
                    addLabel={clientQuickCreate.addLabel}
                  />
                )}
              />
              <FieldErrorText>{errors.client?.message}</FieldErrorText>
            </FieldGroup>
          )}
          <SurfaceTextField
            register={register}
            name="email"
            id="contact-email"
            label={t("fields.email")}
            kind="email"
            required
            autoComplete="email"
            error={errors.email?.message}
          />
          <SurfacePhoneField
            control={control}
            name="phone"
            id="contact-phone"
            label={t("fields.phone")}
            required
            error={errors.phone?.message}
            disabled={saving}
            countryIso={phoneCountry}
          />
        </FormFieldRow>

        <EntityAddressesFields
          control={control}
          register={register}
          setValue={setValue}
          clearErrors={clearErrors}
          errors={errors}
          disabled={saving}
          idPrefix="contact-address"
          includeGeo={false}
          labels={{
            sectionTitle: t("fields.addresses"),
            add: t("addresses.add"),
            remove: t("addresses.remove"),
            rowLabel: (index) => t("addresses.rowLabel", { number: index }),
            addressType: t("fields.addressType"),
            addressLine1: t("fields.addressLine1"),
            addressLine2: t("fields.addressLine2"),
            country: t("fields.country"),
            state: t("fields.stateProvince"),
            city: t("fields.city"),
            pincode: t("fields.pincode"),
            countryPlaceholder: t("placeholders.country"),
            statePlaceholder: t("placeholders.state"),
            cityPlaceholder: t("placeholders.city"),
            addressTypeBilling: t("addressType.billing"),
            addressTypeShipping: t("addressType.shipping"),
            addressTypeOther: t("addressType.other"),
          }}
        />
      </form>
      </>
    </AppModal>
  );
}
