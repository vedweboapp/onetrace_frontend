"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { createContact } from "@/features/contacts/api/contact.api";
import type { Contact } from "@/features/contacts/types/contact.types";
import { createContactFormSchema, type ContactFormValues } from "@/features/contacts/schemas/contact-form-schema";
import {
  emptyContactFormDefaults,
  mapContactFormToPayload,
} from "@/features/contacts/utils/contact-form-map";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import {
  AppButton,
  AppModal,
  AddressLineAutocompleteFields,
  AddressLocationFields,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  SurfacePhoneField,
  surfaceInputClassName,
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
  const [saving, setSaving] = React.useState(false);

  const schema = React.useMemo(
    () =>
      createContactFormSchema({
        name: t("validation.name"),
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
    } finally {
      setSaving(false);
    }
  }

  const [localClientOptions, setLocalClientOptions] = React.useState(clientOptions);
  React.useEffect(() => {
    setLocalClientOptions(clientOptions);
  }, [clientOptions]);

  const noClients = !lockClient && localClientOptions.length === 0;
  const lockedClientLabel =
    lockClient && initialClientId
      ? localClientOptions.find((o) => o.value === initialClientId)?.label
      : undefined;

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
          {lockClient ? (
            <FieldGroup label={t("fields.client")} htmlFor="contact-client-locked">
              <input
                id="contact-client-locked"
                readOnly
                value={lockedClientLabel ?? ""}
                className={cn(surfaceInputClassName, "cursor-default bg-slate-50 dark:bg-slate-900/60")}
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
          <SurfacePhoneField
            control={control}
            name="phone"
            id="contact-phone"
            label={t("fields.phone")}
            required
            error={errors.phone?.message}
            disabled={saving}
          />
          <AddressLineAutocompleteFields
            idPrefix="contact"
            control={control}
            setValue={setValue}
            wrapInRow={false}
            disabled={saving}
            labels={{
              addressLine1: t("fields.addressLine1"),
              addressLine2: t("fields.addressLine2"),
            }}
            errors={{
              address_line_1: errors.address_line_1?.message,
              address_line_2: errors.address_line_2?.message,
            }}
          />
        </FormFieldRow>

        <AddressLocationFields
          idPrefix="contact"
          control={control}
          register={register}
          setValue={setValue}
          disabled={saving}
          labels={{
            country: t("fields.country"),
            state: t("fields.stateProvince"),
            city: t("fields.city"),
            pincode: t("fields.pincode"),
          }}
          placeholders={{
            country: t("placeholders.country"),
            state: t("placeholders.state"),
            city: t("placeholders.city"),
          }}
          errors={{
            country_iso: errors.country_iso?.message,
            state_iso: errors.state_iso?.message,
            city: errors.city?.message,
            pincode: errors.pincode?.message,
          }}
        />
      </form>
      </>
    </AppModal>
  );
}
