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
import { createContact, fetchContact, updateContact } from "@/features/contacts/api/contact.api";
import { createContactFormSchema, type ContactFormValues } from "@/features/contacts/schemas/contact-form-schema";
import { contactToFormDefaults, emptyContactFormDefaults, mapContactFormToPayload } from "@/features/contacts/utils/contact-form-map";
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
  SurfacePhoneField,
  SurfaceShell,
  surfaceInputClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  contactId?: number;
};

export function ContactFormScreen({ mode, contactId }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "contacts");
  const organizations = useAuthStore((s) => s.organizations);
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [organizationIdForEdit, setOrganizationIdForEdit] = React.useState<number | null>(null);

  const schema = React.useMemo(
    () =>
      createContactFormSchema({
        name: t("validation.name"),
        email: t("validation.email"),
        phone: t("validation.phone"),
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
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyContactFormDefaults(),
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: clients } = await fetchClientsPage(1, 500, { is_active: true });
        if (!cancelled) setClientOptions(clients.map((c) => ({ value: String(c.id), label: c.name })));
      } catch {
        if (!cancelled) setClientOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!isEdit || !contactId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchContact(contactId);
        if (!cancelled) {
          reset(contactToFormDefaults(row));
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
  }, [isEdit, contactId, reset, t]);

  async function submit(values: ContactFormValues) {
    const organizationId = getSessionOrganizationId(organizations) ?? (isEdit ? organizationIdForEdit : null);
    if (organizationId == null) {
      toastError(t("missingOrganization"));
      return;
    }
    const payload = mapContactFormToPayload(values, organizationId);
    if (!Number.isFinite(payload.client) || payload.client <= 0) {
      toastError(t("validation.client"));
      return;
    }
    setSaving(true);
    try {
      const saved = isEdit && contactId ? await updateContact(contactId, payload) : await createContact(payload);
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
            <AppButton type="submit" form="contact-upsert-screen-form" variant="primary" size="md" loading={saving} disabled={noClients}>
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
          <form id="contact-upsert-screen-form" className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
            {noClients ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                {t("noClientsHint")}
              </p>
            ) : null}
            <FormFieldRow cols="2">
              <FieldGroup label={t("fields.name")} htmlFor="contact-name" required>
                <input
                  id="contact-name"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? "contact-name-err" : undefined}
                  className={cn(surfaceInputClassName, errors.name && "border-red-500 dark:border-red-500")}
                  {...register("name", {
                    onChange: (e) => {
                      e.target.value = capitalizeFirstLetter(e.target.value);
                    },
                  })}
                />
                <FieldErrorText id="contact-name-err">{errors.name?.message}</FieldErrorText>
              </FieldGroup>
              <FieldGroup label={t("fields.client")} htmlFor="contact-client" required>
                <Controller
                  control={control}
                  name="client"
                  render={({ field }) => (
                    <CheckmarkSelect
                      id="contact-client"
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
              <FieldGroup label={t("fields.email")} htmlFor="contact-email" required>
                <input
                  id="contact-email"
                  type="email"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "contact-email-err" : undefined}
                  className={cn(surfaceInputClassName, errors.email && "border-red-500 dark:border-red-500")}
                  {...register("email")}
                />
                <FieldErrorText id="contact-email-err">{errors.email?.message}</FieldErrorText>
              </FieldGroup>
              <SurfacePhoneField
                control={control}
                name="phone"
                id="contact-phone"
                label={t("fields.phone")}
                required
                error={errors.phone?.message}
                disabled={saving}
              />
              <FieldGroup label={t("fields.addressLine1")} htmlFor="contact-line1" required>
                <input
                  id="contact-line1"
                  aria-invalid={errors.address_line_1 ? true : undefined}
                  aria-describedby={errors.address_line_1 ? "contact-line1-err" : undefined}
                  className={cn(surfaceInputClassName, errors.address_line_1 && "border-red-500 dark:border-red-500")}
                  {...register("address_line_1")}
                />
                <FieldErrorText id="contact-line1-err">{errors.address_line_1?.message}</FieldErrorText>
              </FieldGroup>
              <FieldGroup label={t("fields.addressLine2")} htmlFor="contact-line2">
                <input id="contact-line2" className={surfaceInputClassName} {...register("address_line_2")} />
              </FieldGroup>
            </FormFieldRow>
            <CascadingLocationFields<ContactFormValues>
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
                <FieldGroup label={t("fields.pincode")} htmlFor="contact-pincode" required>
                  <input
                    id="contact-pincode"
                    aria-invalid={errors.pincode ? true : undefined}
                    aria-describedby={errors.pincode ? "contact-pincode-err" : undefined}
                    className={cn(surfaceInputClassName, errors.pincode && "border-red-500 dark:border-red-500")}
                    {...register("pincode")}
                  />
                  <FieldErrorText id="contact-pincode-err">{errors.pincode?.message}</FieldErrorText>
                </FieldGroup>
              }
            />
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
