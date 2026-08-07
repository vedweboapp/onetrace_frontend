"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFieldArray, useWatch, type Control, type FieldErrors } from "react-hook-form";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import { SITE_CONTACT_PERSON_TITLES } from "@/features/sites/constants/site-contact-person.constants";
import { fetchTitlesPage } from "@/features/titles/api/title.api";
import type { Title } from "@/features/titles/types/title.types";
import type { SiteFormValues } from "@/features/sites/schemas/site-form-schema";
import { cn } from "@/core/utils/http.util";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { AppButton, CheckmarkSelect, FieldErrorText, FieldGroup } from "@/shared/ui";

type Props = {
  control: Control<SiteFormValues>;
  errors: FieldErrors<SiteFormValues>;
  disabled?: boolean;
  pendingContactRowRef: React.MutableRefObject<number | null>;
  contactsRefreshKey?: number;
  getFormDraft?: () => unknown;
};

export function SiteContactPersonsFields({
  control,
  errors,
  disabled,
  pendingContactRowRef,
  contactsRefreshKey = 0,
  getFormDraft,
}: Props) {
  const t = useTranslations("Dashboard.sites");
  const clientValue = useWatch({ control, name: "client" });
  const clientId =
    clientValue && /^\d+$/.test(clientValue) ? Number.parseInt(clientValue, 10) : undefined;

  const [contactOptions, setContactOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [loadingContacts, setLoadingContacts] = React.useState(false);

  const reloadContacts = React.useCallback(async () => {
    if (!clientId || clientId <= 0) {
      setContactOptions([]);
      return;
    }
    setLoadingContacts(true);
    try {
      const { items } = await fetchContactsPage(1, 500, { client: clientId, is_active: true });
      setContactOptions(
        items.map((c) => ({
          value: String(c.id),
          label: c.name?.trim() || c.email?.trim() || `#${c.id}`,
        })),
      );
    } catch {
      setContactOptions([]);
    } finally {
      setLoadingContacts(false);
    }
  }, [clientId]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contacts",
  });

  const [titles, setTitles] = React.useState<Title[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { items } = await fetchTitlesPage(1, 500);
        if (!cancelled) {
          setTitles(items);
        }
      } catch {
        if (!cancelled) setTitles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getRowTitleOptions = React.useCallback(
    (selectedValue: string) => {
      const list = [
        {
          value: "",
          label: t("contactPerson.titlePlaceholder"),
        },
        ...titles.map((item) => ({
          value: String(item.id),
          label: item.title,
        })),
      ];

      if (selectedValue && !list.some((opt) => opt.value === selectedValue)) {
        const isLegacy = (SITE_CONTACT_PERSON_TITLES as readonly string[]).includes(selectedValue);
        list.push({
          value: selectedValue,
          label: isLegacy
            ? t(`contactPerson.titles.${selectedValue}`, { defaultValue: selectedValue })
            : selectedValue,
        });
      }

      return list;
    },
    [titles, t],
  );

  const contactSelectOptions = React.useMemo(
    () => [
      {
        value: "",
        label: t("contactPerson.contactPlaceholder"),
      },
      ...contactOptions,
    ],
    [contactOptions, t],
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      await reloadContacts();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadContacts, contactsRefreshKey]);

  const rowErrors = errors.contacts;
  const contactsSectionError =
    rowErrors && !Array.isArray(rowErrors) && typeof rowErrors.message === "string"
      ? rowErrors.message
      : undefined;
  const canAdd = Boolean(clientId && clientId > 0) && !disabled;

  const contactQuickCreate = useQuickCreate({
    kind: "contact",
    clientId,
    addDisabled: disabled || !clientId,
    getFormDraft,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("contactPerson.sectionTitle")}</h3>
          <FieldErrorText>{contactsSectionError}</FieldErrorText>
        </div>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canAdd || loadingContacts}
          onClick={() => append({ title: "", contact: "" })}
        >
          <Plus className="size-4" aria-hidden />
          {t("contactPerson.add")}
        </AppButton>
      </div>

      {!clientId ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
          {t("contactPerson.selectClientFirst")}
        </p>
      ) : null}

      {fields.length === 0 && clientId ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("contactPerson.empty")}</p>
      ) : null}

      <div className="space-y-3">
        {fields.map((field, index) => {
          const titleErr = rowErrors?.[index]?.title?.message;
          const contactErr = rowErrors?.[index]?.contact?.message;
          return (
            <div
              key={field.id}
              className={cn(
                "grid gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40",
                "sm:grid-cols-[1fr_1fr_auto]",
              )}
            >
              <FieldGroup label={t("contactPerson.titleLabel")} htmlFor={`site-cp-title-${index}`} required>
                <Controller
                  control={control}
                  name={`contacts.${index}.title`}
                  render={({ field: titleField }) => (
                    <CheckmarkSelect
                      id={`site-cp-title-${index}`}
                      portaled
                      listLabel={t("contactPerson.titleLabel")}
                      options={getRowTitleOptions(titleField.value)}
                      value={titleField.value}
                      emptyLabel={t("contactPerson.titlePlaceholder")}
                      disabled={disabled}
                      invalid={!!titleErr}
                      onBlur={titleField.onBlur}
                      onChange={titleField.onChange}
                    />
                  )}
                />
                <FieldErrorText>{titleErr}</FieldErrorText>
              </FieldGroup>

              <FieldGroup label={t("contactPerson.contactLabel")} htmlFor={`site-cp-contact-${index}`} required>
                <Controller
                  control={control}
                  name={`contacts.${index}.contact`}
                  render={({ field: contactField }) => (
                    <CheckmarkSelect
                      id={`site-cp-contact-${index}`}
                      portaled
                      searchable
                      listLabel={t("contactPerson.contactLabel")}
                      options={contactSelectOptions}
                      value={contactField.value}
                      emptyLabel={
                        loadingContacts
                          ? t("contactPerson.loadingContacts")
                          : contactOptions.length === 0
                            ? t("contactPerson.noContactsForClient")
                            : t("contactPerson.contactPlaceholder")
                      }
                      disabled={disabled || !clientId || loadingContacts}
                      invalid={!!contactErr}
                      onBlur={contactField.onBlur}
                      onChange={contactField.onChange}
                      onAdd={
                        contactQuickCreate.onAdd
                          ? () => {
                              pendingContactRowRef.current = index;
                              contactQuickCreate.onAdd?.();
                            }
                          : undefined
                      }
                      addAriaLabel={contactQuickCreate.addAriaLabel}
                      addLabel={contactQuickCreate.addLabel}
                    />
                  )}
                />
                <FieldErrorText>{contactErr}</FieldErrorText>
              </FieldGroup>

              <div className="flex items-end sm:pb-0.5">
                <AppButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-9 p-0 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                  disabled={disabled}
                  aria-label={t("contactPerson.remove")}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </AppButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
