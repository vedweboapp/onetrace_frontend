"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { createClient, updateClient } from "@/features/clients/api/client.api";
import { createClientFormSchema, type ClientFormValues } from "@/features/clients/schemas/client-form-schema";
import type { Client } from "@/features/clients/types/client.types";
import {
  clientToFormDefaults,
  emptyClientFormDefaults,
  mapClientFormToPayload,
} from "@/features/clients/utils/client-form-map";
import { cn } from "@/core/utils/http.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import {
  AppButton,
  AppModal,
  AddressFormFields,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  FormFieldSpanFull,
  SurfacePhoneField,
  surfaceInputClassName,
} from "@/shared/ui";

const FORM_DOM_ID = "client-upsert-form";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  client: Client | null;
  onSaved: () => void;
  /** When set, returns the created client without requiring a list refresh. */
  onCreated?: (client: Client) => void;
};

export function ClientFormModal({ open, onClose, mode, client, onSaved, onCreated }: Props) {
  const t = useTranslations("Dashboard.clients");
  const [saving, setSaving] = React.useState(false);

  const schema = React.useMemo(
    () =>
      createClientFormSchema({
        name: t("validation.name"),
        email: t("validation.email"),
        phoneInvalid: t("validation.phoneInvalid"),
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
  } = useForm<ClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyClientFormDefaults(),
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && client) reset(clientToFormDefaults(client));
    else reset(emptyClientFormDefaults());
  }, [open, mode, client, reset]);

  async function submit(values: ClientFormValues) {
    const payload = mapClientFormToPayload(values);
    setSaving(true);
    try {
      if (mode === "edit" && client) {
        await updateClient(client.id, payload);
        toastSuccess(t("updatedToast"));
      } else {
        const created = await createClient(payload);
        toastSuccess(t("createdToast"));
        onCreated?.(created);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleCloseAttempt() {
    if (!saving) onClose();
  }

  return (
    <AppModal
      open={open}
      onClose={handleCloseAttempt}
      title={mode === "edit" ? t("modal.editTitle") : t("modal.createTitle")}
      titleId="client-modal-title"
      closeOnBackdrop={!saving}
      isBusy={saving}
      size="3xl"
      footer={
        <>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => handleCloseAttempt()}
          >
            {t("modal.cancel")}
          </AppButton>
          <AppButton
            type="submit"
            form={FORM_DOM_ID}
            variant="primary"
            size="sm"
            loading={saving}
          >
            {mode === "edit" ? t("modal.saveChanges") : t("modal.save")}
          </AppButton>
        </>
      }
    >
      <form id={FORM_DOM_ID} className="space-y-6" noValidate onSubmit={handleSubmit(submit)}>
        <div>
        
          <FormFieldRow cols="2" className="mt-3">
            <FieldGroup label={t("fields.name")} htmlFor="client-name" required>
              <input
                id="client-name"
                autoComplete="name"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "client-name-err" : undefined}
                className={cn(surfaceInputClassName, errors.name && "border-red-500 dark:border-red-500")}
                {...register("name", {
                  onChange: (e) => {
                    e.target.value = capitalizeFirstLetter(e.target.value);
                  },
                })}
              />
              <FieldErrorText id="client-name-err">{errors.name?.message}</FieldErrorText>
            </FieldGroup>
          </FormFieldRow>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("detail.sectionContact")}
          </h3>
          <FormFieldRow cols="2" className="mt-3">
            <FieldGroup label={t("fields.email")} htmlFor="client-email" required>
              <input
                id="client-email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "client-email-err" : undefined}
                className={cn(surfaceInputClassName, errors.email && "border-red-500 dark:border-red-500")}
                {...register("email")}
              />
              <FieldErrorText id="client-email-err">{errors.email?.message}</FieldErrorText>
            </FieldGroup>
            <FormFieldSpanFull className="sm:col-span-2 lg:col-span-2">
              <SurfacePhoneField
                control={control}
                name="phone"
                id="client-phone"
                label={t("fields.phone")}
                required
                error={errors.phone?.message}
                disabled={saving}
              />
            </FormFieldSpanFull>
          </FormFieldRow>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("form.section.address")}
          </h3>
          <AddressFormFields
            idPrefix="client"
            control={control}
            register={register}
            setValue={setValue}
            className="mt-3"
            disabled={saving}
            labels={{
              addressLine1: t("fields.addressLine1"),
              addressLine2: t("fields.addressLine2"),
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
              address_line_1: errors.address_line_1?.message,
              address_line_2: errors.address_line_2?.message,
              country_iso: errors.country_iso?.message,
              state_iso: errors.state_iso?.message,
              city: errors.city?.message,
              pincode: errors.pincode?.message,
            }}
          />
        </div>
      </form>
    </AppModal>
  );
}
