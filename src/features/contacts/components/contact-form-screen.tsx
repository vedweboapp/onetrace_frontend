"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { createContact, fetchContact, updateContact } from "@/features/contacts/api/contact.api";
import { createContactFormSchema, type ContactFormValues } from "@/features/contacts/schemas/contact-form-schema";
import { contactToFormDefaults, emptyContactFormDefaults, mapContactFormToPayload } from "@/features/contacts/utils/contact-form-map";
import type { ContactType } from "@/features/contacts/types/contact.types";
import { fetchVendorsPage } from "@/features/vendors/api/vendor.api";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { clearQuickCreateFormDraft } from "@/shared/utils/quick-create-form-draft.util";
import {
  buildQuickCreateReturnHref,
  QUICK_CREATE_CLIENT_PARAM,
  QUICK_CREATE_CONTACT_TYPE_PARAM,
  QUICK_CREATE_VENDOR_PARAM,
  resolveFormBackUrl,
} from "@/shared/utils/quick-create-navigation.util";
import {
  AppButton,
  AddressLineAutocompleteFields,
  AddressLocationFields,
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

function parseContactTypeParam(raw: string | null): ContactType | null {
  if (raw === "client" || raw === "vendor") return raw;
  return null;
}

export function ContactFormScreen({ mode, contactId }: Props) {
  const t = useTranslations("Dashboard.contacts");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = resolveFormBackUrl(searchParams.get("back"), "contacts", routes.dashboard.contacts);
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [vendorOptions, setVendorOptions] = React.useState<{ value: string; label: string }[]>([]);

  const schema = React.useMemo(
    () =>
      createContactFormSchema({
        name: t("validation.name"),
        email: t("validation.email"),
        phoneInvalid: t("validation.phoneInvalid"),
        contactType: t("validation.contactType"),
        client: t("validation.client"),
        vendor: t("validation.vendor"),
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
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyContactFormDefaults(),
  });

  const contactType = useWatch({ control, name: "contact_type" }) ?? "client";

  const contactTypeOptions = React.useMemo(
    () => [
      { value: "client", label: t("tabs.client") },
      { value: "vendor", label: t("tabs.vendor") },
    ],
    [t],
  );

  const reloadClients = React.useCallback(async () => {
    try {
      const { items: clients } = await fetchClientsPage(1, 500, { is_active: true });
      setClientOptions(clients.map((c) => ({ value: String(c.id), label: c.name })));
    } catch {
      setClientOptions([]);
    }
  }, []);

  const reloadVendors = React.useCallback(async () => {
    try {
      const { items: vendors } = await fetchVendorsPage(1, 500, { is_active: true });
      setVendorOptions(vendors.map((v) => ({ value: String(v.id), label: v.name })));
    } catch {
      setVendorOptions([]);
    }
  }, []);

  React.useEffect(() => {
    void reloadClients();
    void reloadVendors();
  }, [reloadClients, reloadVendors]);

  const draftReturnTo = React.useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const getFormDraft = React.useCallback(() => getValues(), [getValues]);
  const restoreFormDraft = React.useCallback(
    (draft: unknown) => {
      reset(draft as ContactFormValues, { keepDefaultValues: false });
    },
    [reset],
  );

  const clientQuickCreate = useQuickCreate({
    kind: "client",
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });

  React.useEffect(() => {
    if (isEdit) return;
    const presetType = parseContactTypeParam(searchParams.get(QUICK_CREATE_CONTACT_TYPE_PARAM));
    if (presetType) {
      setValue("contact_type", presetType, { shouldDirty: true, shouldValidate: true });
    }
    const presetClient = searchParams.get(QUICK_CREATE_CLIENT_PARAM);
    if (presetClient && /^\d+$/.test(presetClient)) {
      setValue("client", presetClient, { shouldDirty: true, shouldValidate: true });
    }
    const presetVendor = searchParams.get(QUICK_CREATE_VENDOR_PARAM);
    if (presetVendor && /^\d+$/.test(presetVendor)) {
      setValue("vendor", presetVendor, { shouldDirty: true, shouldValidate: true });
    }
  }, [isEdit, searchParams, setValue]);

  useQuickCreateReturn({
    restoreFormDraft: !isEdit ? restoreFormDraft : undefined,
    onReloadOptions: async () => {
      await reloadClients();
      await reloadVendors();
    },
    onApplySelect: ({ selectTarget, selectId }) => {
      if (selectTarget === "client") {
        setValue("contact_type", "client", { shouldDirty: true, shouldValidate: true });
        setValue("client", selectId, { shouldDirty: true, shouldValidate: true });
      }
    },
  });

  React.useEffect(() => {
    if (!isEdit || !contactId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchContact(contactId);
        if (!cancelled) reset(contactToFormDefaults(row));
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
    const payload = mapContactFormToPayload(values);
    if (values.contact_type === "vendor") {
      if (!Number.isFinite(payload.vendor) || (payload.vendor ?? 0) <= 0) {
        toastError(t("validation.vendor"));
        return;
      }
    } else if (!Number.isFinite(payload.client) || (payload.client ?? 0) <= 0) {
      toastError(t("validation.client"));
      return;
    }
    setSaving(true);
    try {
      const saved = isEdit && contactId ? await updateContact(contactId, payload) : await createContact(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      if (!isEdit) clearQuickCreateFormDraft(draftReturnTo);
      router.replace(buildQuickCreateReturnHref(safeBack, saved.id, "contact"));
    } finally {
      setSaving(false);
    }
  }

  const noParents = contactType === "vendor" ? vendorOptions.length === 0 : clientOptions.length === 0;

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={isEdit ? t("page.editSubtitle") : t("page.createSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => router.push(safeBack ?? routes.dashboard.contacts)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="submit" form="contact-upsert-screen-form" variant="primary" size="sm" loading={saving} disabled={noParents}>
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
          <form id="contact-upsert-screen-form" className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
            {noParents ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                {contactType === "vendor" ? t("noVendorsHint") : t("noClientsHint")}
              </p>
            ) : null}
            <FormFieldRow cols="2">
              <FieldGroup label={t("fields.contactType")} htmlFor="contact-type" required>
                <Controller
                  control={control}
                  name="contact_type"
                  render={({ field }) => (
                    <CheckmarkSelect
                      id="contact-type"
                      portaled
                      listLabel={t("fields.contactType")}
                      options={contactTypeOptions}
                      value={field.value}
                      emptyLabel={t("placeholders.contactType")}
                      disabled={saving}
                      invalid={!!errors.contact_type}
                      onBlur={field.onBlur}
                      onChange={(v) => {
                        field.onChange(v === "vendor" ? "vendor" : "client");
                      }}
                    />
                  )}
                />
                <FieldErrorText>{errors.contact_type?.message}</FieldErrorText>
              </FieldGroup>
              {contactType === "vendor" ? (
                <FieldGroup label={t("fields.vendor")} htmlFor="contact-vendor" required>
                  <Controller
                    control={control}
                    name="vendor"
                    render={({ field }) => (
                      <CheckmarkSelect
                        id="contact-vendor"
                        portaled
                        searchable
                        listLabel={t("fields.vendor")}
                        options={vendorOptions}
                        value={field.value}
                        emptyLabel={t("placeholders.vendor")}
                        disabled={saving || noParents}
                        invalid={!!errors.vendor}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <FieldErrorText>{errors.vendor?.message}</FieldErrorText>
                </FieldGroup>
              ) : (
                <FieldGroup label={t("fields.client")} htmlFor="contact-client" required>
                  <Controller
                    control={control}
                    name="client"
                    render={({ field }) => (
                      <CheckmarkSelect
                        id="contact-client"
                        portaled
                        searchable
                        listLabel={t("fields.client")}
                        options={clientOptions}
                        value={field.value}
                        emptyLabel={t("placeholders.client")}
                        disabled={saving || noParents}
                        invalid={!!errors.client}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        onAdd={clientQuickCreate.onAdd}
                        addAriaLabel={clientQuickCreate.addAriaLabel}
                        addLabel={clientQuickCreate.addLabel}
                      />
                    )}
                  />
                  <FieldErrorText>{errors.client?.message}</FieldErrorText>
                </FieldGroup>
              )}
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
              <AddressLineAutocompleteFields
                idPrefix="contact"
                control={control}
                setValue={setValue}
                wrapInRow={false}
                disabled={saving}
                labels={{
                  addressLine1: t("fields.addressLine1"),
                  addressLine2: t("fields.addressLine2"),
                }}
                errors={{
                  address_line_1: errors.address_line_1?.message,
                  address_line_2: errors.address_line_2?.message,
                }}
              />
            </FormFieldRow>
            <AddressLocationFields
              idPrefix="contact"
              control={control}
              register={register}
              setValue={setValue}
              disabled={saving}
              labels={{
                country: t("fields.country"),
                state: t("fields.stateProvince"),
                city: t("fields.city"),
                pincode: t("fields.pincode"),
              }}
              placeholders={{
                country: t("placeholders.country"),
                state: t("placeholders.state"),
                city: t("placeholders.city"),
              }}
              errors={{
                country_iso: errors.country_iso?.message,
                state_iso: errors.state_iso?.message,
                city: errors.city?.message,
                pincode: errors.pincode?.message,
              }}
            />
          </form>
          </>
        )}
      </SurfaceShell>
    </div>
  );
}
