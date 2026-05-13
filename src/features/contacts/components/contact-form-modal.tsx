"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { getSessionOrganizationId } from "@/features/auth/utils/get-session-organization-id";
import { createContact } from "@/features/contacts/api/contact.api";
import { createContactFormSchema, type ContactFormValues } from "@/features/contacts/schemas/contact-form-schema";
import {
  emptyContactFormDefaults,
  mapContactFormToPayload,
} from "@/features/contacts/utils/contact-form-map";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import {
  AppButton,
  AppModal,
  CascadingLocationFields,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  surfaceInputClassName,
} from "@/shared/ui";

const FORM_DOM_ID = "contact-create-form";
export type ContactClientOption = { value: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  clientOptions: ContactClientOption[];
  onSaved: () => void;
};

export function ContactFormModal({ open, onClose, clientOptions, onSaved }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const organizations = useAuthStore((s) => s.organizations);
  const [saving, setSaving] = React.useState(false);

  const schema = React.useMemo(
    () =>
      createContactFormSchema({
        name: t("validation.name"),
        email: t("validation.email"),
        phone: t("validation.phone"),
        client: t("validation.client"),
        addressLine1: t("validation.addressLine1"),
        country: t("validation.country"),
        state: t("validation.state"),
        city: t("validation.city"),
        pincode: t("validation.pincode"),
      }),
    [t],
  );

  const {
    control,
    register,
    reset,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyContactFormDefaults(),
  });

  React.useEffect(() => {
    if (!open) return;
    reset(emptyContactFormDefaults());
  }, [open, reset]);

  async function submit(values: ContactFormValues) {
    const organizationId = getSessionOrganizationId(organizations);
    if (organizationId == null) {
      toastError(t("missingOrganization"));
      return;
    }
    const payload = mapContactFormToPayload(values, organizationId);
    if (!Number.isFinite(payload.client) || payload.client <= 0) {
      toastError(t("validation.client"));
      return;
    }
    setSaving(true);
    try {
      await createContact(payload);
      toastSuccess(t("createdToast"));
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const noClients = clientOptions.length === 0;

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
          <AppButton type="button" variant="secondary" size="md" disabled={saving} onClick={() => (!saving ? onClose() : undefined)}>
            {t("modal.cancel")}
          </AppButton>
          <AppButton type="submit" form={FORM_DOM_ID} variant="primary" size="md" loading={saving} disabled={noClients}>
            {t("modal.save")}
          </AppButton>
        </>
      }
    >
      <form id={FORM_DOM_ID} className="space-y-6" noValidate onSubmit={handleSubmit(submit)}>
        {noClients ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {t("noClientsHint")}
          </p>
        ) : null}

        <FormFieldRow cols="2">
          <FieldGroup label={t("fields.name")} htmlFor="contact-name" required>
            <input
              id="contact-name"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "contact-name-err" : undefined}
              className={cn(surfaceInputClassName, errors.name && "border-red-500 dark:border-red-500")}
              {...register("name", {
                onChange: (e) => {
                  e.target.value = capitalizeFirstLetter(e.target.value);
                },
              })}
            />
            <FieldErrorText id="contact-name-err">{errors.name?.message}</FieldErrorText>
          </FieldGroup>
          <FieldGroup label={t("fields.client")} htmlFor="contact-client" required>
            <Controller
              control={control}
              name="client"
              render={({ field }) => (
                <CheckmarkSelect
                  id="contact-client"
                  portaled
                  listLabel={t("fields.client")}
                  options={clientOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.client")}
                  disabled={saving || noClients}
                  invalid={!!errors.client}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldErrorText>{errors.client?.message}</FieldErrorText>
          </FieldGroup>
          <FieldGroup label={t("fields.email")} htmlFor="contact-email" required>
            <input
              id="contact-email"
              type="email"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "contact-email-err" : undefined}
              className={cn(surfaceInputClassName, errors.email && "border-red-500 dark:border-red-500")}
              {...register("email")}
            />
            <FieldErrorText id="contact-email-err">{errors.email?.message}</FieldErrorText>
          </FieldGroup>
          <FieldGroup label={t("fields.phone")} htmlFor="contact-phone" required>
            <input
              id="contact-phone"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? "contact-phone-err" : undefined}
              className={cn(surfaceInputClassName, errors.phone && "border-red-500 dark:border-red-500")}
              {...register("phone")}
            />
            <FieldErrorText id="contact-phone-err">{errors.phone?.message}</FieldErrorText>
          </FieldGroup>
          <FieldGroup label={t("fields.addressLine1")} htmlFor="contact-line1" required>
            <input
              id="contact-line1"
              aria-invalid={errors.address_line_1 ? true : undefined}
              aria-describedby={errors.address_line_1 ? "contact-line1-err" : undefined}
              className={cn(surfaceInputClassName, errors.address_line_1 && "border-red-500 dark:border-red-500")}
              {...register("address_line_1")}
            />
            <FieldErrorText id="contact-line1-err">{errors.address_line_1?.message}</FieldErrorText>
          </FieldGroup>
          <FieldGroup label={t("fields.addressLine2")} htmlFor="contact-line2">
            <input id="contact-line2" className={surfaceInputClassName} {...register("address_line_2")} />
          </FieldGroup>
        </FormFieldRow>

        <CascadingLocationFields<ContactFormValues>
          control={control}
          setValue={setValue}
          countryIsoName="country_iso"
          stateIsoName="state_iso"
          cityName="city"
          labels={{
            country: t("fields.country"),
            state: t("fields.stateProvince"),
            city: t("fields.city"),
          }}
          placeholders={{
            country: t("placeholders.country"),
            state: t("placeholders.state"),
            city: t("placeholders.city"),
          }}
          disabled={saving}
          errors={{
            country: errors.country_iso?.message,
            state: errors.state_iso?.message,
            city: errors.city?.message,
          }}
          trailingSlot={
            <FieldGroup label={t("fields.pincode")} htmlFor="contact-pincode" required>
              <input
                id="contact-pincode"
                aria-invalid={errors.pincode ? true : undefined}
                aria-describedby={errors.pincode ? "contact-pincode-err" : undefined}
                className={cn(surfaceInputClassName, errors.pincode && "border-red-500 dark:border-red-500")}
                {...register("pincode")}
              />
              <FieldErrorText id="contact-pincode-err">{errors.pincode?.message}</FieldErrorText>
            </FieldGroup>
          }
        />
      </form>
    </AppModal>
  );
}
