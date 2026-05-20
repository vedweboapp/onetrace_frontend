"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { getSessionOrganizationId } from "@/features/auth/utils/get-session-organization-id";
import { createSite, updateSite } from "@/features/sites/api/site.api";
import { createSiteFormSchema, type SiteFormValues } from "@/features/sites/schemas/site-form-schema";
import type { Site } from "@/features/sites/types/site.types";
import {
  emptySiteFormDefaults,
  mapSiteFormToPayload,
  siteToFormDefaults,
} from "@/features/sites/utils/site-form-map";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { SiteLocationFields } from "@/features/sites/components/site-location-fields";
import {
  AppButton,
  AppModal,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  surfaceInputClassName,
} from "@/shared/ui";

const FORM_DOM_ID = "site-upsert-form";
export type SiteClientOption = { value: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  site: Site | null;
  clientOptions: SiteClientOption[];
  onSaved: () => void;
};

export function SiteFormModal({ open, onClose, mode, site, clientOptions, onSaved }: Props) {
  const t = useTranslations("Dashboard.sites");
  const organizations = useAuthStore((s) => s.organizations);
  const [saving, setSaving] = React.useState(false);

  const schema = React.useMemo(
    () =>
      createSiteFormSchema({
        siteName: t("validation.siteName"),
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
  } = useForm<SiteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptySiteFormDefaults(),
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && site) reset(siteToFormDefaults(site));
    else reset(emptySiteFormDefaults());
  }, [open, mode, site, reset]);

  async function submit(values: SiteFormValues) {
    const organizationId = getSessionOrganizationId(organizations) ?? (mode === "edit" && site ? site.organization : null);
    if (organizationId == null) {
      toastError(t("missingOrganization"));
      return;
    }
    const payload = mapSiteFormToPayload(values, organizationId);
    if (!Number.isFinite(payload.client) || payload.client <= 0) {
      toastError(t("validation.client"));
      return;
    }
    setSaving(true);
    try {
      if (mode === "edit" && site) {
        await updateSite(site.id, payload);
        toastSuccess(t("updatedToast"));
      } else {
        await createSite(payload);
        toastSuccess(t("createdToast"));
      }
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
      title={mode === "edit" ? t("modal.editTitle") : t("modal.createTitle")}
      titleId="site-modal-title"
      closeOnBackdrop={!saving}
      isBusy={saving}
      size="3xl"
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => (!saving ? onClose() : undefined)}>
            {t("modal.cancel")}
          </AppButton>
          <AppButton type="submit" form={FORM_DOM_ID} variant="primary" size="sm" loading={saving} disabled={noClients}>
            {mode === "edit" ? t("modal.saveChanges") : t("modal.save")}
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
          <FieldGroup label={t("fields.siteName")} htmlFor="site-name" required>
            <input
              id="site-name"
              aria-invalid={errors.site_name ? true : undefined}
              aria-describedby={errors.site_name ? "site-name-err" : undefined}
              className={cn(surfaceInputClassName, errors.site_name && "border-red-500 dark:border-red-500")}
              {...register("site_name", {
                onChange: (e) => {
                  e.target.value = capitalizeFirstLetter(e.target.value);
                },
              })}
            />
            <FieldErrorText id="site-name-err">{errors.site_name?.message}</FieldErrorText>
          </FieldGroup>
          <FieldGroup label={t("fields.client")} htmlFor="site-client" required>
            <Controller
              control={control}
              name="client"
              render={({ field }) => (
                <CheckmarkSelect
                  id="site-client"
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
        </FormFieldRow>

        <SiteLocationFields control={control} register={register} setValue={setValue} errors={errors} disabled={saving} />

        <FormFieldRow cols="1">
          <FieldGroup label={t("fields.what3words")} htmlFor="site-modal-what3words">
            <input
              id="site-modal-what3words"
              className={surfaceInputClassName}
              placeholder={t("placeholders.what3words")}
              autoComplete="off"
              spellCheck={false}
              {...register("what3words")}
            />
          </FieldGroup>
        </FormFieldRow>
      </form>
    </AppModal>
  );
}
