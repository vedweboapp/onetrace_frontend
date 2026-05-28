"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { createSite, fetchSite, updateSite } from "@/features/sites/api/site.api";
import { createSiteFormSchema, type SiteFormValues } from "@/features/sites/schemas/site-form-schema";
import { emptySiteFormDefaults, mapSiteFormToPayload, siteToFormDefaults } from "@/features/sites/utils/site-form-map";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { SiteContactPersonsFields } from "@/features/sites/components/site-contact-persons-fields";
import { SiteLocationFields } from "@/features/sites/components/site-location-fields";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { clearQuickCreateFormDraft } from "@/shared/utils/quick-create-form-draft.util";
import {
  buildQuickCreateReturnHref,
  QUICK_CREATE_CLIENT_PARAM,
  resolveFormBackUrl,
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
  const safeBack = resolveFormBackUrl(searchParams.get("back"), "sites", routes.dashboard.sites);
  const isEdit = mode === "edit";
  const pendingContactRowRef = React.useRef<number | null>(null);

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [contactsRefreshKey, setContactsRefreshKey] = React.useState(0);

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
      }),
    [t],
  );

  const {
    control,
    register,
    reset,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<SiteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptySiteFormDefaults(),
  });

  const reloadClients = React.useCallback(async () => {
    try {
      const { items } = await fetchClientsPage(1, 500, { is_active: true });
      setClientOptions(items.map((c) => ({ value: String(c.id), label: c.name })));
    } catch {
      setClientOptions([]);
    }
  }, []);

  React.useEffect(() => {
    void reloadClients();
  }, [reloadClients]);

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

  const clientQuickCreate = useQuickCreate({
    kind: "client",
    getFormDraft: !isEdit ? getFormDraft : undefined,
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
        setValue("client", selectId, { shouldDirty: true, shouldValidate: true });
        setValue("contacts", [], { shouldDirty: true, shouldValidate: true });
        return;
      }
      if (selectTarget === "contact") {
        setContactsRefreshKey((k) => k + 1);
        const rowIndex = pendingContactRowRef.current;
        if (rowIndex != null) {
          setValue(`contacts.${rowIndex}.contact`, selectId, { shouldDirty: true, shouldValidate: true });
        } else {
          const current = getValues("contacts") ?? [];
          const emptyIdx = current.findIndex((r) => !r.contact?.trim());
          if (emptyIdx >= 0) {
            setValue(`contacts.${emptyIdx}.contact`, selectId, { shouldDirty: true, shouldValidate: true });
          } else {
            setValue("contacts", [...current, { title: "site_contact", contact: selectId }], {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
        }
        pendingContactRowRef.current = null;
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
      router.replace(buildQuickCreateReturnHref(safeBack, saved.id, "site"));
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
                </FormFieldRow>
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
              footer={
                <SiteContactPersonsFields
                  control={control}
                  errors={errors}
                  disabled={saving}
                  clientOptions={clientOptions}
                  pendingContactRowRef={pendingContactRowRef}
                  contactsRefreshKey={contactsRefreshKey}
                  getFormDraft={!isEdit ? getFormDraft : undefined}
                />
              }
            />
          </form>
          </>
        )}
      </SurfaceShell>
    </div>
  );
}
