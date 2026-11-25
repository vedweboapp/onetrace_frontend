"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { createSite, fetchSite, fetchSitesPage, updateSite } from "@/features/sites/api/site.api";
import { createSiteFormSchema, type SiteFormValues } from "@/features/sites/schemas/site-form-schema";
import { emptySiteFormDefaults, getSiteLocationDefaults, mapSiteFormToPayload, siteToFormDefaults } from "@/features/sites/utils/site-form-map";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import type { Site } from "@/features/sites/types/site.types";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { SiteLocationFields } from "@/features/sites/components/site-location-fields";
import { SiteNamePlaceField } from "@/features/sites/components/site-name-place-field";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { clearQuickCreateFormDraft } from "@/shared/utils/quick-create-form-draft.util";
import {
  QUICK_CREATE_CLIENT_PARAM,
  QUICK_CREATE_SELECT_TARGET_PARAM,
  hrefAfterEntityCreate,
} from "@/shared/utils/quick-create-navigation.util";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = useFormBackUrl("sites", routes.dashboard.sites);
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [parentSiteOptions, setParentSiteOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [parentSitesList, setParentSitesList] = React.useState<Site[]>([]);

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
    getValues,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<SiteFormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: emptySiteFormDefaults(),
  });

  const applyPlaceRef = React.useRef<((place: PlaceSuggestion) => void) | null>(null);

  const reloadClients = React.useCallback(async () => {
    try {
      const { items } = await fetchClientsPage(1, 20, { is_active: true, dropdown: true });
      setClientOptions(items.map((c) => ({ value: String(c.id), label: c.name })));
    } catch {
      setClientOptions([]);
    }
  }, []);

  const reloadParentSites = React.useCallback(async () => {
    try {
      const { items } = await fetchSitesPage(1, 100, { dropdown: true });
      const filtered = siteId ? items.filter((s) => s.id !== siteId) : items;
      setParentSitesList(filtered);
      setParentSiteOptions([
        { value: "", label: t("placeholders.parentSite") },
        ...filtered.map((s) => ({ value: String(s.id), label: s.site_name })),
      ]);
    } catch {
      setParentSitesList([]);
      setParentSiteOptions([]);
    }
  }, [siteId, t]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void reloadClients();
      void reloadParentSites();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reloadClients, reloadParentSites]);

  const draftReturnTo = React.useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const getFormDraft = React.useCallback(() => getValues(), [getValues]);
  const restoreFormDraft = React.useCallback(
    (draft: unknown) => {
      reset(draft as SiteFormValues, { keepDefaultValues: false });
    },
    [reset],
  );

  const urlClientId = searchParams.get(QUICK_CREATE_CLIENT_PARAM);
  const lockClient = !isEdit && Boolean(urlClientId && /^\d+$/.test(urlClientId));

  const clientQuickCreate = useQuickCreate({
    kind: "client",
    getFormDraft: !isEdit && !lockClient ? getFormDraft : undefined,
    addDisabled: lockClient,
  });

  React.useEffect(() => {
    if (isEdit) return;
    const presetClient = searchParams.get(QUICK_CREATE_CLIENT_PARAM);
    if (!presetClient || !/^\d+$/.test(presetClient)) return;
    setValue("client", presetClient, { shouldDirty: true, shouldValidate: true });
  }, [isEdit, searchParams, setValue]);

  useQuickCreateReturn({
    restoreFormDraft: !isEdit ? restoreFormDraft : undefined,
    onReloadOptions: reloadClients,
    onApplySelect: ({ selectTarget, selectId }) => {
      if (selectTarget === "client") {
        if (lockClient) return;
        setValue("client", selectId, { shouldDirty: true, shouldValidate: true });
        return;
      }
    },
  });

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
      if (!isEdit) clearQuickCreateFormDraft(draftReturnTo);
      router.replace(
        hrefAfterEntityCreate({
          createdId: saved.id,
          selectTarget: isEdit ? null : searchParams.get(QUICK_CREATE_SELECT_TARGET_PARAM),
          backHref: safeBack,
          listPath: routes.dashboard.sites,
        }),
      );
    } catch (error) {
      reportFormSubmitApiError(error, setError);
    } finally {
      setSaving(false);
    }
  }

  const noClients = !lockClient && clientOptions.length === 0;

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
          <>
          <form id="site-upsert-screen-form" className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
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
              applyPlaceRef={applyPlaceRef}
              leading={
                <div className="space-y-6">
                  <FormFieldRow cols="2">
                    <FieldGroup
                      label={t("fields.parentSite")}
                      htmlFor="site-parent-site"
                    >
                      <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                        {t("fields.parentSiteHint")}
                      </p>
                      <Controller
                        control={control}
                        name="parent_site"
                        render={({ field }) => (
                          <CheckmarkSelect
                            id="site-parent-site"
                            portaled
                            searchable
                            listLabel={t("fields.parentSite")}
                            options={parentSiteOptions}
                            value={field.value ?? ""}
                            emptyLabel={t("placeholders.parentSite")}
                            disabled={saving}
                            invalid={!!errors.parent_site}
                            onBlur={field.onBlur}
                            onChange={(v) => {
                              setValue("parent_site", v, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              });
                              if (v) {
                                const selectedParent = parentSitesList.find((s) => String(s.id) === v);
                                if (selectedParent) {
                                  setValue("site_name", selectedParent.site_name, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                  const loc = getSiteLocationDefaults(selectedParent);
                                  if (loc.country_iso) {
                                    setValue("country_iso", loc.country_iso, { shouldDirty: true, shouldValidate: true });
                                  }
                                  if (loc.state_iso) {
                                    setValue("state_iso", loc.state_iso, { shouldDirty: true, shouldValidate: true });
                                  }
                                  if (loc.city) {
                                    setValue("city", loc.city, { shouldDirty: true, shouldValidate: true });
                                  }
                                  if (loc.pincode) {
                                    setValue("pincode", loc.pincode, { shouldDirty: true, shouldValidate: true });
                                  }
                                  if (loc.address_line_1) {
                                    setValue("address_line_1", loc.address_line_1, { shouldDirty: true, shouldValidate: true });
                                  }
                                  if (loc.address_line_2) {
                                    setValue("address_line_2", loc.address_line_2, { shouldDirty: true, shouldValidate: true });
                                  }
                                  window.setTimeout(() => {
                                    const el = document.getElementById("site-name") as HTMLInputElement | null;
                                    if (el) {
                                      el.focus();
                                      const len = el.value.length;
                                      el.setSelectionRange(len, len);
                                    }
                                  }, 50);
                                }
                              }
                            }}
                          />
                        )}
                      />
                      <FieldErrorText>{errors.parent_site?.message}</FieldErrorText>
                    </FieldGroup>
                  </FormFieldRow>

                  <FormFieldRow cols="2">
                    <SiteNamePlaceField
                      control={control}
                      setValue={setValue}
                      error={errors.site_name?.message}
                      disabled={saving}
                      onPlaceSelected={(place) => applyPlaceRef.current?.(place)}
                    />
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
                          locked={lockClient}
                            invalid={!!errors.client}
                            onBlur={field.onBlur}
                            onChange={(v) => {
                              setValue("client", v, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              });
                            }}
                            onAdd={clientQuickCreate.onAdd}
                            addAriaLabel={clientQuickCreate.addAriaLabel}
                            addLabel={clientQuickCreate.addLabel}
                          />
                        )}
                      />
                      <FieldErrorText>{errors.client?.message}</FieldErrorText>
                    </FieldGroup>
                  </FormFieldRow>
                </div>
              }
              afterAddress={
                <FormFieldRow cols="2">
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
              }
            />
          </form>
          </>
        )}
      </SurfaceShell>
    </div>
  );
}
