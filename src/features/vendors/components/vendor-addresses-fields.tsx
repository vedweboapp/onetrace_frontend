"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import type { VendorFormValues } from "@/features/vendors/schemas/vendor-form-schema";
import { AddressPlaceAutocomplete } from "@/shared/components/maps/address-place-autocomplete";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { buildAddressSearchContext } from "@/shared/utils/address-place-form.util";
import { AppButton, CascadingLocationFields, FieldErrorText, FieldGroup, FormFieldRow, surfaceInputClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  control: Control<VendorFormValues>;
  register: UseFormRegister<VendorFormValues>;
  setValue: UseFormSetValue<VendorFormValues>;
  errors: FieldErrors<VendorFormValues>;
  disabled?: boolean;
};

function applyPlaceToRow(
  setValue: UseFormSetValue<VendorFormValues>,
  index: number,
  place: PlaceSuggestion,
) {
  const base = `addresses.${index}` as const;
  if (place.line1) setValue(`${base}.address_line_1`, place.line1, { shouldValidate: true });
  if (place.line2) setValue(`${base}.address_line_2`, place.line2);
  if (place.countryIso) setValue(`${base}.country_iso`, place.countryIso, { shouldValidate: true });
  setValue(`${base}.state_iso`, place.stateIso ?? "", { shouldValidate: true });
  setValue(`${base}.city`, place.city ?? "", { shouldValidate: true });
  if (place.pincode) setValue(`${base}.pincode`, place.pincode, { shouldValidate: true });
  setValue(`${base}.latitude`, String(place.lat));
  setValue(`${base}.longitude`, String(place.lon));
}

export function VendorAddressesFields({ control, register, setValue, errors, disabled }: Props) {
  const t = useTranslations("Dashboard.vendors");
  const { fields, append, remove } = useFieldArray({ control, name: "addresses" });
  const watched = useWatch({ control, name: "addresses" }) ?? [];

  const setPrimary = (index: number) => {
    fields.forEach((_, i) => {
      setValue(`addresses.${i}.is_primary`, i === index);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("fields.addresses")}</h3>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() =>
            append({
              address_line_1: "",
              address_line_2: "",
              country_iso: "",
              state_iso: "",
              city: "",
              pincode: "",
              latitude: "",
              longitude: "",
              is_primary: fields.length === 0,
            })
          }
        >
          <Plus className="size-4" aria-hidden />
          {t("addresses.add")}
        </AppButton>
      </div>

      {fields.map((field, index) => {
        const row = watched[index];
        const rowErrors = errors.addresses?.[index];
        const countryIso = row?.country_iso ?? "";
        const searchContext = buildAddressSearchContext({
          countryIso,
          stateIso: row?.state_iso ?? "",
          city: row?.city ?? "",
          pincode: row?.pincode ?? "",
        });
        const idPrefix = `vendor-address-${index}`;

        return (
          <div
            key={field.id}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t("addresses.rowLabel", { index: index + 1 })}
              </span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="radio"
                    name="vendor-primary-address"
                    checked={Boolean(row?.is_primary)}
                    disabled={disabled}
                    onChange={() => setPrimary(index)}
                  />
                  {t("addresses.primary")}
                </label>
                {fields.length > 1 ? (
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={disabled}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {t("addresses.remove")}
                  </AppButton>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <FormFieldRow cols="2">
                <Controller
                  control={control}
                  name={`addresses.${index}.address_line_1`}
                  render={({ field: f }) => (
                    <AddressPlaceAutocomplete
                      id={`${idPrefix}-line1`}
                      label={t("fields.addressLine1")}
                      required
                      value={f.value ?? ""}
                      onChange={f.onChange}
                      onBlur={f.onBlur}
                      countryIso={countryIso}
                      contextCity={searchContext.city}
                      contextState={searchContext.state}
                      contextCountry={searchContext.country}
                      disabled={disabled}
                      invalid={Boolean(rowErrors?.address_line_1)}
                      onSelectPlace={(place) => applyPlaceToRow(setValue, index, place)}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`addresses.${index}.address_line_2`}
                  render={({ field: f }) => (
                    <AddressPlaceAutocomplete
                      id={`${idPrefix}-line2`}
                      label={t("fields.addressLine2")}
                      value={f.value ?? ""}
                      onChange={f.onChange}
                      onBlur={f.onBlur}
                      countryIso={countryIso}
                      contextCity={searchContext.city}
                      contextState={searchContext.state}
                      contextCountry={searchContext.country}
                      disabled={disabled}
                      onSelectPlace={(place) => {
                        if (place.line2) setValue(`addresses.${index}.address_line_2`, place.line2);
                      }}
                    />
                  )}
                />
              </FormFieldRow>
              {rowErrors?.address_line_1 ? (
                <FieldErrorText>{rowErrors.address_line_1.message}</FieldErrorText>
              ) : null}

              <CascadingLocationFields
                control={control}
                setValue={setValue}
                countryIsoName={`addresses.${index}.country_iso`}
                stateIsoName={`addresses.${index}.state_iso`}
                cityName={`addresses.${index}.city`}
                disabled={disabled}
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
                errors={{
                  country: rowErrors?.country_iso?.message,
                  state: rowErrors?.state_iso?.message,
                  city: rowErrors?.city?.message,
                }}
                trailingSlot={
                  <FieldGroup label={t("fields.pincode")} htmlFor={`${idPrefix}-pincode`} required>
                    <Controller
                      control={control}
                      name={`addresses.${index}.pincode`}
                      render={({ field: f }) => (
                        <input
                          id={`${idPrefix}-pincode`}
                          {...f}
                          disabled={disabled}
                          className={cn(
                            surfaceInputClassName,
                            rowErrors?.pincode && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                          )}
                        />
                      )}
                    />
                    {rowErrors?.pincode ? <FieldErrorText>{rowErrors.pincode.message}</FieldErrorText> : null}
                  </FieldGroup>
                }
              />

              <input type="hidden" {...register(`addresses.${index}.latitude`)} />
              <input type="hidden" {...register(`addresses.${index}.longitude`)} />
            </div>
          </div>
        );
      })}
      {errors.addresses?.message ? <FieldErrorText>{errors.addresses.message}</FieldErrorText> : null}
    </div>
  );
}
