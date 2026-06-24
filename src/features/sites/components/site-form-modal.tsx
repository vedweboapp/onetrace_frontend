"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Controller, useForm } from "react-hook-form";
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
import { routes } from "@/shared/config/routes";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { SiteContactPersonsFields } from "@/features/sites/components/site-contact-persons-fields";
import { SiteLocationFields } from "@/features/sites/components/site-location-fields";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
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
  initialClientId?: string;
  onCreated?: (site: Site) => void;
  /** When true, client is fixed (e.g. opened from a client detail tab). */
  lockClient?: boolean;
};

export function SiteFormModal({
  open,
  onClose,
  mode,
  site,
  clientOptions,
  onSaved,
  initialClientId,
  onCreated,
  lockClient = false,
}: Props) {
  const t = useTranslations("Dashboard.sites");
  const router = useRouter();
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
        contactPersonTitle: t("validation.contactPersonTitle"),
        contactPerson: t("validation.contactPerson"),
        contactPersonDuplicate: t("validation.contactPersonDuplicate"),
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
    else {
      reset({
        ...emptySiteFormDefaults(),
        ...(initialClientId ? { client: initialClientId } : {}),
      });
    }
  }, [open, mode, site, reset, initialClientId]);

  async function submit(values: SiteFormValues) {
    const payload = mapSiteFormToPayload(values);
    if (!Number.isFinite(payload.client) || payload.client <= 0) {
      toastError(t("validation.client"));
      return;
    }
    setSaving(true);
    try {
      if (mode === "edit" && site) {
        await updateSite(site.id, payload);
        toastSuccess(t("updatedToast"));
        onSaved();
        onClose();
        router.push(buildEntityDetailHrefAfterSave(routes.dashboard.sites, site.id, routes.dashboard.sites));
      } else {
        const created = await createSite(payload);
        toastSuccess(t("createdToast"));
        onCreated?.(created);
        onSaved();
        onClose();
        router.push(buildEntityDetailHrefAfterSave(routes.dashboard.sites, created.id, routes.dashboard.sites));
      }
    } finally {
      setSaving(false);
    }
  }

  const localClientOptions = clientOptions;
  const noClients = !lockClient && localClientOptions.length === 0;
  const lockedClientLabel =
    lockClient && initialClientId
      ? localClientOptions.find((o) => o.value === initialClientId)?.label
      : undefined;

  const clientQuickCreate = useQuickCreate({ kind: "client", addDisabled: lockClient });
  const pendingContactRowRef = React.useRef<number | null>(null);

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

        <SiteLocationFields
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
          disabled={saving}
          leading={
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
              {lockClient ? (
                <FieldGroup label={t("fields.client")} htmlFor="site-client-locked">
                  <input
                    id="site-client-locked"
                    readOnly
                    value={lockedClientLabel ?? ""}
                    className={cn(surfaceInputClassName, "cursor-default bg-slate-50 dark:bg-slate-900/60")}
                  />
                </FieldGroup>
              ) : (
                <FieldGroup label={t("fields.client")} htmlFor="site-client" required>
                  <Controller
                    control={control}
                    name="client"
                    render={({ field }) => (
                      <CheckmarkSelect
                        id="site-client"
                        portaled
                        searchable
                        listLabel={t("fields.client")}
                        options={localClientOptions}
                        value={field.value}
                        emptyLabel={t("placeholders.client")}
                        disabled={saving || noClients}
                        invalid={!!errors.client}
                        onBlur={field.onBlur}
                        onChange={(v) => {
                          field.onChange(v);
                          setValue("contacts", [], { shouldDirty: true, shouldValidate: true });
                        }}
                        onAdd={clientQuickCreate.onAdd}
                        addAriaLabel={clientQuickCreate.addAriaLabel}
                        addLabel={clientQuickCreate.addLabel}
                      />
                    )}
                  />
                  <FieldErrorText>{errors.client?.message}</FieldErrorText>
                </FieldGroup>
              )}
            </FormFieldRow>
          }
          afterAddress={
            <FormFieldRow cols="2">
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
          }
          footer={
            <SiteContactPersonsFields
              control={control}
              errors={errors}
              disabled={saving}
              pendingContactRowRef={pendingContactRowRef}
            />
          }
        />
      </form>
    </AppModal>
  );
}
