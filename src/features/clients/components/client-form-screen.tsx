"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { usePhoneCountryFromAddresses } from "@/shared/hooks/use-phone-country-from-address";
import { createClient, fetchClient, updateClient } from "@/features/clients/api/client.api";
import { createClientFormSchema, type ClientFormValues } from "@/features/clients/schemas/client-form-schema";
import {
  clientToFormDefaults,
  emptyClientFormDefaults,
  mapClientFormToPayload,
} from "@/features/clients/utils/client-form-map";
import { EntityAddressesFields } from "@/shared/components/form/entity-addresses-fields";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import {
  hrefAfterEntityCreate,
  QUICK_CREATE_SELECT_TARGET_PARAM,
} from "@/shared/utils/quick-create-navigation.util";
import {
  AppButton,
  FormFieldRow,
  SurfacePhoneField,
  SurfaceShell,
  SurfaceTextField,
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
  const clientsListHref = React.useMemo(() => {
    const needle = routes.dashboard.clients;
    const i = pathname.indexOf(needle);
    return i >= 0 ? pathname.slice(0, i + needle.length) : needle;
  }, [pathname]);
  const safeBack = useFormBackUrl("clients", clientsListHref);
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);

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
    if (!isEdit || !clientId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchClient(clientId);
        if (!cancelled) reset(clientToFormDefaults(row));
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
    const payload = mapClientFormToPayload(values);
    setSaving(true);
    try {
      const saved = isEdit && clientId ? await updateClient(clientId, payload) : await createClient(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      router.replace(
        hrefAfterEntityCreate({
          createdId: saved.id,
          selectTarget: isEdit ? null : searchParams.get(QUICK_CREATE_SELECT_TARGET_PARAM),
          backHref: safeBack,
          listPath: routes.dashboard.clients,
        }),
      );
    } catch (error) {
      reportFormSubmitApiError(error, setError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={isEdit ? t("page.editSubtitle") : t("page.createSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => router.push(safeBack)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="submit" form="client-upsert-screen-form" variant="primary" size="sm" loading={saving}>
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
            <FormFieldRow cols="2">
              <SurfaceTextField
                register={register}
                name="name"
                id="client-name"
                label={t("fields.name")}
                kind="companyName"
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

            <EntityAddressesFields
              control={control}
              register={register}
              setValue={setValue}
              errors={errors}
              disabled={saving}
              idPrefix="client-address"
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
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
