"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Controller,
  useFieldArray,
  useWatch,
  type ArrayPath,
  type Control,
  type FieldErrors,
  type FieldValues,
  type Path,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { AddressPlaceAutocomplete } from "@/shared/components/maps/address-place-autocomplete";
import {
  emptyEntityAddressFormRow,
  entityAddressTypeOptions,
  type EntityAddressFormRow,
} from "@/shared/form/entity-address-form.util";
import { FIELD_MAX_LENGTH } from "@/shared/form/field-max-length.util";
import { sanitizeAddressInput, sanitizeDigitsInput } from "@/shared/form/field-input.util";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { buildAddressSearchContext } from "@/shared/utils/address-place-form.util";
import {
  AppButton,
  CascadingLocationFields,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  surfaceInputClassName,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

export type EntityAddressesFieldsLabels = {
  sectionTitle: string;
  add: string;
  remove: string;
  primary: string;
  rowLabel: (index: number) => string;
  addressType: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  countryPlaceholder: string;
  statePlaceholder: string;
  cityPlaceholder: string;
  addressTypeBilling: string;
  addressTypeShipping: string;
  addressTypeOther: string;
};

type Props<T extends FieldValues> = {
  control: Control<T>;
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  errors: FieldErrors<T>;
  labels: EntityAddressesFieldsLabels;
  disabled?: boolean;
  idPrefix?: string;
  /** When true, include hidden lat/lon fields (vendors / maps). Default true. */
  includeGeo?: boolean;
};

function applyPlaceToRow<T extends FieldValues>(
  setValue: UseFormSetValue<T>,
  index: number,
  place: PlaceSuggestion,
) {
  const base = `addresses.${index}` as Path<T>;
  if (place.line1) setValue(`${base}.address_line_1` as Path<T>, place.line1 as never, { shouldValidate: true });
  if (place.line2) setValue(`${base}.address_line_2` as Path<T>, place.line2 as never);
  if (place.countryIso) setValue(`${base}.country_iso` as Path<T>, place.countryIso as never, { shouldValidate: true });
  setValue(`${base}.state_iso` as Path<T>, (place.stateIso ?? "") as never, { shouldValidate: true });
  setValue(`${base}.city` as Path<T>, (place.city ?? "") as never, { shouldValidate: true });
  if (place.pincode) setValue(`${base}.pincode` as Path<T>, place.pincode as never, { shouldValidate: true });
  setValue(`${base}.latitude` as Path<T>, String(place.lat) as never);
  setValue(`${base}.longitude` as Path<T>, String(place.lon) as never);
}

export function EntityAddressesFields<T extends FieldValues>({
  control,
  register,
  setValue,
  errors,
  labels,
  disabled,
  idPrefix = "entity-address",
  includeGeo = true,
}: Props<T>) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses" as ArrayPath<T>,
  });
  const watched = (useWatch({ control, name: "addresses" as Path<T> }) as EntityAddressFormRow[] | undefined) ?? [];

  const typeOptions = React.useMemo(
    () =>
      entityAddressTypeOptions((key) => {
        if (key === "addressType.billing") return labels.addressTypeBilling;
        if (key === "addressType.shipping") return labels.addressTypeShipping;
        return labels.addressTypeOther;
      }),
    [labels.addressTypeBilling, labels.addressTypeOther, labels.addressTypeShipping],
  );

  const setPrimary = (index: number) => {
    fields.forEach((_, i) => {
      setValue(`addresses.${i}.is_primary` as Path<T>, (i === index) as never);
    });
  };

  const addressErrors = errors.addresses as FieldErrors<EntityAddressFormRow>[] | undefined;
  const addressesRootError = (errors.addresses as { message?: string } | undefined)?.message;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{labels.sectionTitle}</h3>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() =>
            append(
              emptyEntityAddressFormRow({
                address_type: "other",
                is_primary: fields.length === 0,
              }) as never,
            )
          }
        >
          <Plus className="size-4" aria-hidden />
          {labels.add}
        </AppButton>
      </div>

      {fields.map((field, index) => {
        const row = watched[index];
        const rowErrors = addressErrors?.[index];
        const countryIso = row?.country_iso ?? "";
        const searchContext = buildAddressSearchContext({
          countryIso,
          stateIso: row?.state_iso ?? "",
          city: row?.city ?? "",
          pincode: row?.pincode ?? "",
        });
        const rowIdPrefix = `${idPrefix}-${index}`;

        return (
          <div
            key={field.id}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {labels.rowLabel(index + 1)}
              </span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="radio"
                    name={`${idPrefix}-primary`}
                    checked={Boolean(row?.is_primary)}
                    disabled={disabled}
                    onChange={() => setPrimary(index)}
                  />
                  {labels.primary}
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
                    {labels.remove}
                  </AppButton>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <FormFieldRow cols="2">
                <div>
                  <Controller
                    control={control}
                    name={`addresses.${index}.address_type` as Path<T>}
                    render={({ field: f }) => (
                      <CheckmarkSelect
                        id={`${rowIdPrefix}-type`}
                        label={labels.addressType}
                        listLabel={labels.addressType}
                        options={typeOptions}
                        value={String(f.value ?? "billing")}
                        onChange={f.onChange}
                        disabled={disabled}
                        emptyLabel={labels.addressType}
                        className="w-full"
                      />
                    )}
                  />
                  {rowErrors?.address_type ? (
                    <FieldErrorText>{String(rowErrors.address_type.message ?? "")}</FieldErrorText>
                  ) : null}
                </div>
                <Controller
                  control={control}
                  name={`addresses.${index}.address_line_1` as Path<T>}
                  render={({ field: f }) => (
                    <AddressPlaceAutocomplete
                      id={`${rowIdPrefix}-line1`}
                      label={labels.addressLine1}
                      required
                      value={String(f.value ?? "")}
                      onChange={f.onChange}
                      onBlur={f.onBlur}
                      countryIso={countryIso}
                      contextCity={searchContext.city}
                      contextState={searchContext.state}
                      contextCountry={searchContext.country}
                      disabled={disabled}
                      invalid={Boolean(rowErrors?.address_line_1)}
                      error={rowErrors?.address_line_1 ? String(rowErrors.address_line_1.message ?? "") : undefined}
                      onSelectPlace={(place) => applyPlaceToRow(setValue, index, place)}
                      maxLength={FIELD_MAX_LENGTH.ADDRESS_LINE}
                    />
                  )}
                />
              </FormFieldRow>

              <FormFieldRow cols="2">
                <Controller
                  control={control}
                  name={`addresses.${index}.address_line_2` as Path<T>}
                  render={({ field: f }) => (
                    <FieldGroup label={labels.addressLine2} htmlFor={`${rowIdPrefix}-line2`}>
                      <input
                        id={`${rowIdPrefix}-line2`}
                        autoComplete="address-line2"
                        className={surfaceInputClassName}
                        disabled={disabled}
                        maxLength={FIELD_MAX_LENGTH.ADDRESS_LINE}
                        value={String(f.value ?? "")}
                        onChange={(e) => f.onChange(sanitizeAddressInput(e.target.value))}
                        onBlur={f.onBlur}
                      />
                    </FieldGroup>
                  )}
                />
                <FieldGroup label={labels.pincode} htmlFor={`${rowIdPrefix}-pincode`} required>
                  <Controller
                    control={control}
                    name={`addresses.${index}.pincode` as Path<T>}
                    render={({ field: f }) => (
                      <input
                        id={`${rowIdPrefix}-pincode`}
                        maxLength={FIELD_MAX_LENGTH.PINCODE}
                        value={String(f.value ?? "")}
                        onChange={(e) => f.onChange(sanitizeDigitsInput(e.target.value))}
                        onBlur={f.onBlur}
                        disabled={disabled}
                        className={cn(
                          surfaceInputClassName,
                          rowErrors?.pincode && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                        )}
                      />
                    )}
                  />
                  {rowErrors?.pincode ? (
                    <FieldErrorText>{String(rowErrors.pincode.message ?? "")}</FieldErrorText>
                  ) : null}
                </FieldGroup>
              </FormFieldRow>

              <CascadingLocationFields
                control={control}
                setValue={setValue}
                countryIsoName={`addresses.${index}.country_iso` as Path<T>}
                stateIsoName={`addresses.${index}.state_iso` as Path<T>}
                cityName={`addresses.${index}.city` as Path<T>}
                disabled={disabled}
                labels={{
                  country: labels.country,
                  state: labels.state,
                  city: labels.city,
                }}
                placeholders={{
                  country: labels.countryPlaceholder,
                  state: labels.statePlaceholder,
                  city: labels.cityPlaceholder,
                }}
                errors={{
                  country: rowErrors?.country_iso?.message as string | undefined,
                  state: rowErrors?.state_iso?.message as string | undefined,
                  city: rowErrors?.city?.message as string | undefined,
                }}
              />

              <input
                type="hidden"
                {...register(`addresses.${index}.id` as Path<T>, {
                  setValueAs: (value) => {
                    if (value === "" || value == null) return undefined;
                    const parsed = typeof value === "number" ? value : Number(value);
                    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
                  },
                })}
              />
              {includeGeo ? (
                <>
                  <input type="hidden" {...register(`addresses.${index}.latitude` as Path<T>)} />
                  <input type="hidden" {...register(`addresses.${index}.longitude` as Path<T>)} />
                </>
              ) : null}
            </div>
          </div>
        );
      })}
      {addressesRootError ? <FieldErrorText>{addressesRootError}</FieldErrorText> : null}
    </div>
  );
}
