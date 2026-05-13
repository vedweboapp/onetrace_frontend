"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { getSessionOrganizationId } from "@/features/auth/utils/get-session-organization-id";
import { createClient, fetchClient, updateClient } from "@/features/clients/api/client.api";
import { createClientFormSchema, type ClientFormValues } from "@/features/clients/schemas/client-form-schema";
import {
  clientToFormDefaults,
  emptyClientFormDefaults,
  mapClientFormToPayload,
} from "@/features/clients/utils/client-form-map";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import {
  AppButton,
  CascadingLocationFields,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  FormFieldSpanFull,
  SurfacePhoneField,
  SurfaceShell,
  surfaceInputClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  clientId?: number;
};

export function ClientFormScreen({ mode, clientId }: Props) {
  const t = useTranslations("Dashboard.clients");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "clients");
  const clientsListHref = React.useMemo(() => {
    const needle = routes.dashboard.clients;
    const i = pathname.indexOf(needle);
    return i >= 0 ? pathname.slice(0, i + needle.length) : needle;
  }, [pathname]);
  const listBack = safeBack ?? clientsListHref;
  const organizations = useAuthStore((s) => s.organizations);
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [organizationIdForEdit, setOrganizationIdForEdit] = React.useState<number | null>(null);

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
    if (!isEdit || !clientId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchClient(clientId);
        if (!cancelled) {
          reset(clientToFormDefaults(row));
          setOrganizationIdForEdit(row.organization ?? null);
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
  }, [clientId, isEdit, reset, t]);

  async function submit(values: ClientFormValues) {
    const organizationId = getSessionOrganizationId(organizations) ?? (isEdit ? organizationIdForEdit : null);
    if (organizationId == null) {
      toastError(t("missingOrganization"));
      return;
    }
    const payload = mapClientFormToPayload(values, organizationId);
    setSaving(true);
    try {
      const saved = isEdit && clientId ? await updateClient(clientId, payload) : await createClient(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      router.replace(`${listBack}?highlight=${saved.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={listBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={isEdit ? t("page.editSubtitle") : t("page.createSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="md" disabled={saving} onClick={() => router.push(listBack)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="submit" form="client-upsert-screen-form" variant="primary" size="md" loading={saving}>
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
          <form id="client-upsert-screen-form" className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
            <div>
            
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
                {/* <FormFieldSpanFull className="sm:col-span-2 lg:col-span-2"> */}
                  <SurfacePhoneField
                    control={control}
                    name="phone"
                    id="client-phone"
                    label={t("fields.phone")}
                    required
                    error={errors.phone?.message}
                    disabled={saving}
                  />
                {/* </FormFieldSpanFull> */}
              </FormFieldRow>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("form.section.address")}
              </h3>
              <FormFieldRow cols="1" className="mt-3">
                <FieldGroup label={t("fields.addressLine1")} htmlFor="client-line1" required>
                  <input
                    id="client-line1"
                    autoComplete="address-line1"
                    aria-invalid={errors.address_line_1 ? true : undefined}
                    aria-describedby={errors.address_line_1 ? "client-line1-err" : undefined}
                    className={cn(surfaceInputClassName, errors.address_line_1 && "border-red-500 dark:border-red-500")}
                    {...register("address_line_1")}
                  />
                  <FieldErrorText id="client-line1-err">{errors.address_line_1?.message}</FieldErrorText>
                </FieldGroup>
                <FieldGroup label={t("fields.addressLine2")} htmlFor="client-line2">
                  <input
                    id="client-line2"
                    autoComplete="address-line2"
                    aria-invalid={errors.address_line_2 ? true : undefined}
                    className={cn(surfaceInputClassName, errors.address_line_2 && "border-red-500 dark:border-red-500")}
                    {...register("address_line_2")}
                  />
                  <FieldErrorText>{errors.address_line_2?.message}</FieldErrorText>
                </FieldGroup>
              </FormFieldRow>

              <div className="mt-4">
                <CascadingLocationFields<ClientFormValues>
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
                    <FieldGroup label={t("fields.pincode")} htmlFor="client-pincode" required>
                      <input
                        id="client-pincode"
                        autoComplete="postal-code"
                        aria-invalid={errors.pincode ? true : undefined}
                        aria-describedby={errors.pincode ? "client-pincode-err" : undefined}
                        className={cn(surfaceInputClassName, errors.pincode && "border-red-500 dark:border-red-500")}
                        {...register("pincode")}
                      />
                      <FieldErrorText id="client-pincode-err">{errors.pincode?.message}</FieldErrorText>
                    </FieldGroup>
                  }
                />
              </div>
            </div>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
