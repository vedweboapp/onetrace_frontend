"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFieldArray, type Control } from "react-hook-form";
import type { QuotationFormValues } from "@/features/quotations/schemas/quotation-form-schema";
import { cn } from "@/core/utils/http.util";
import { AppButton, CheckmarkSelect, FieldGroup } from "@/shared/ui";

type Option = { value: string; label: string };

type Props = {
  control: Control<QuotationFormValues>;
  contactOptions: Option[];
  customerId: number | undefined;
  disabled?: boolean;
  onAddContact?: () => void;
  addAriaLabel?: string;
  addLabel?: string;
  onRequestAddContact?: (rowIndex: number) => void;
};

export function QuotationAdditionalContactsFields({
  control,
  contactOptions,
  customerId,
  disabled,
  onAddContact,
  addAriaLabel,
  addLabel,
  onRequestAddContact,
}: Props) {
  const t = useTranslations("Dashboard.quotations");
  const { fields, append, remove } = useFieldArray({
    control,
    name: "additional_customer_contacts",
  });

  const canAdd = Boolean(customerId && customerId > 0) && !disabled;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("fields.additionalContacts")}</h3>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canAdd}
          onClick={() => append({ contact: "" })}
        >
          <Plus className="size-4" aria-hidden />
          {t("additionalContacts.add")}
        </AppButton>
      </div>

      {!customerId ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
          {t("additionalContacts.selectClientFirst")}
        </p>
      ) : null}

      {fields.length === 0 && customerId ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("additionalContacts.empty")}</p>
      ) : null}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className={cn(
              "grid gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40",
              "sm:grid-cols-[1fr_auto]",
            )}
          >
            <FieldGroup
              label={t("additionalContacts.rowLabel", { number: index + 1 })}
              htmlFor={`quotation-additional-contact-${index}`}
            >
              <Controller
                control={control}
                name={`additional_customer_contacts.${index}.contact`}
                render={({ field: contactField }) => (
                  <CheckmarkSelect
                    id={`quotation-additional-contact-${index}`}
                    portaled
                    searchable
                    listLabel={t("additionalContacts.rowLabel", { number: index + 1 })}
                    options={contactOptions}
                    value={contactField.value}
                    emptyLabel={t("placeholders.contactOptional")}
                    disabled={disabled || !customerId}
                    onBlur={contactField.onBlur}
                    onChange={contactField.onChange}
                    onAdd={
                      onAddContact && onRequestAddContact
                        ? () => {
                            onRequestAddContact(index);
                            onAddContact();
                          }
                        : onAddContact
                    }
                    addAriaLabel={addAriaLabel}
                    addLabel={addLabel}
                  />
                )}
              />
            </FieldGroup>

            <div className="flex items-end sm:pb-0.5">
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                className="size-9 p-0 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                disabled={disabled}
                aria-label={t("additionalContacts.remove")}
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" aria-hidden />
              </AppButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
