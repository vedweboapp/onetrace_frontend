"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { usePhoneCountryFromAddresses } from "@/shared/hooks/use-phone-country-from-address";
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
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import {
  AppButton,
  AppModal,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  SurfacePhoneField,
  SurfaceTextField,
  surfaceInputClassName,
} from "@/shared/ui";
import { EntityAddressesFields } from "@/shared/components/form/entity-addresses-fields";

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
  const router = useRouter();
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
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyClientFormDefaults(),
  });

  const phoneCountry = usePhoneCountryFromAddresses(control);

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
        onSaved();
        onClose();
        router.push(buildEntityDetailHrefAfterSave(routes.dashboard.clients, client.id, routes.dashboard.clients));
      } else {
        const created = await createClient(payload);
        toastSuccess(t("createdToast"));
        onCreated?.(created);
        onSaved();
        onClose();
        router.push(buildEntityDetailHrefAfterSave(routes.dashboard.clients, created.id, routes.dashboard.clients));
      }
    } catch (error) {
      reportFormSubmitApiError(error, setError);
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
            <SurfaceTextField
                register={register}
                name="name"
                id="client-name"
                label={t("fields.name")}
                kind="name"
                required
                autoComplete="name"
                error={errors.name?.message}
              />
            <SurfaceTextField
                register={register}
                name="email"
                id="client-email"
                label={t("fields.email")}
                kind="email"
                required
                autoComplete="email"
                error={errors.email?.message}
              />
          </FormFieldRow>
        </div>

        <FormFieldRow cols="2">
          <SurfacePhoneField
            control={control}
            name="phone"
            id="client-phone"
            label={t("fields.phone")}
            required
            error={errors.phone?.message}
            disabled={saving}
            countryIso={phoneCountry}
          />
        </FormFieldRow>

        <div>
          <EntityAddressesFields
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            disabled={saving}
            idPrefix="client-modal-address"
            includeGeo={false}
            labels={{
              sectionTitle: t("fields.addresses"),
              add: t("addresses.add"),
              remove: t("addresses.remove"),
              primary: t("addresses.primary"),
              rowLabel: (index) => t("addresses.rowLabel", { index }),
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
        </div>
      </form>
    </AppModal>
  );
}
