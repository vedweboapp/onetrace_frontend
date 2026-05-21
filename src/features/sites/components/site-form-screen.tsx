"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { createSite, fetchSite, updateSite } from "@/features/sites/api/site.api";
import { createSiteFormSchema, type SiteFormValues } from "@/features/sites/schemas/site-form-schema";
import { emptySiteFormDefaults, mapSiteFormToPayload, siteToFormDefaults } from "@/features/sites/utils/site-form-map";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { SiteLocationFields } from "@/features/sites/components/site-location-fields";
import {
  AppButton,
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
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);

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
        if (!cancelled) reset(siteToFormDefaults(row));
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
    const payload = mapSiteFormToPayload(values);
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
    <div className="space-y-4 pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={isEdit ? t("page.editSubtitle") : t("page.createSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => router.push(safeBack ?? routes.dashboard.sites)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="submit" form="site-upsert-screen-form" variant="primary" size="sm" loading={saving} disabled={noClients}>
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
                      searchable
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
              <FieldGroup label={t("fields.what3words")} htmlFor="site-what3words">
                <input
                  id="site-what3words"
                  className={surfaceInputClassName}
                  placeholder={t("placeholders.what3words")}
                  autoComplete="off"
                  spellCheck={false}
                  {...register("what3words")}
                />
              </FieldGroup>
            </FormFieldRow>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
