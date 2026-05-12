"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { getSessionOrganizationId } from "@/features/auth/utils/get-session-organization-id";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { createSite, fetchSite, updateSite } from "@/features/sites/api/site.api";
import { createSiteFormSchema, type SiteFormValues } from "@/features/sites/schemas/site-form-schema";
import { emptySiteFormDefaults, mapSiteFormToPayload, siteToFormDefaults } from "@/features/sites/utils/site-form-map";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import {
  AppButton,
  CascadingLocationFields,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  SurfaceShell,
  surfaceInputClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  siteId?: number;
};

export function SiteFormScreen({ mode, siteId }: Props) {
  const t = useTranslations("Dashboard.sites");
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "sites");
  const organizations = useAuthStore((s) => s.organizations);
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [organizationIdForEdit, setOrganizationIdForEdit] = React.useState<number | null>(null);

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
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchClientsPage(1, 500, { is_active: true });
        if (!cancelled) setClientOptions(items.map((c) => ({ value: String(c.id), label: c.name })));
      } catch {
        if (!cancelled) setClientOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!isEdit || !siteId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchSite(siteId);
        if (!cancelled) {
          reset(siteToFormDefaults(row));
          setOrganizationIdForEdit(row.organization);
        }
      } catch {
        if (!cancelled) setScreenError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, siteId, reset, t]);

  async function submit(values: SiteFormValues) {
    const organizationId = getSessionOrganizationId(organizations) ?? (isEdit ? organizationIdForEdit : null);
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
      const saved = isEdit && siteId ? await updateSite(siteId, payload) : await createSite(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      router.replace(`${safeBack}?highlight=${saved.id}`);
    } finally {
      setSaving(false);
    }
  }

  const noClients = clientOptions.length === 0;

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={isEdit ? t("page.editSubtitle") : t("page.createSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="md" disabled={saving} onClick={() => router.push(safeBack)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="submit" form="site-upsert-screen-form" variant="primary" size="md" loading={saving} disabled={noClients}>
              {isEdit ? t("modal.saveChanges") : t("modal.save")}
            </AppButton>
          </div>
        }
      />
      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        {loadingExisting ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : screenError ? (
          <div className="space-y-4 p-4 sm:p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{screenError}</p>
          </div>
        ) : (
          <form id="site-upsert-screen-form" className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
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
              <FieldGroup label={t("fields.addressLine1")} htmlFor="site-line1" required>
                <input
                  id="site-line1"
                  aria-invalid={errors.address_line_1 ? true : undefined}
                  aria-describedby={errors.address_line_1 ? "site-line1-err" : undefined}
                  className={cn(surfaceInputClassName, errors.address_line_1 && "border-red-500 dark:border-red-500")}
                  {...register("address_line_1")}
                />
                <FieldErrorText id="site-line1-err">{errors.address_line_1?.message}</FieldErrorText>
              </FieldGroup>
              <FieldGroup label={t("fields.addressLine2")} htmlFor="site-line2">
                <input id="site-line2" className={surfaceInputClassName} {...register("address_line_2")} />
              </FieldGroup>
            </FormFieldRow>
            <CascadingLocationFields<SiteFormValues>
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
                <FieldGroup label={t("fields.pincode")} htmlFor="site-pincode" required>
                  <input
                    id="site-pincode"
                    aria-invalid={errors.pincode ? true : undefined}
                    aria-describedby={errors.pincode ? "site-pincode-err" : undefined}
                    className={cn(surfaceInputClassName, errors.pincode && "border-red-500 dark:border-red-500")}
                    {...register("pincode")}
                  />
                  <FieldErrorText id="site-pincode-err">{errors.pincode?.message}</FieldErrorText>
                </FieldGroup>
              }
            />
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
