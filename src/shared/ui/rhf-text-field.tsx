"use client";

import type { ChangeEvent, ReactNode } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";
import { TextField } from "./text-field";

export type RhfTextFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  id: string;
  label: ReactNode;
  type: "email" | "password" | "text";
  autoComplete?: string;
  placeholder?: string;
  translateError: (messageKey: string) => string;
  onEdit?: () => void;
  appearance?: "default" | "light";
  passwordToggle?: boolean;
  passwordToggleAria?: { show: string; hide: string };
};

export function RhfTextField<TFieldValues extends FieldValues>({
  control,
  name,
  id,
  label,
  type,
  autoComplete,
  placeholder,
  translateError,
  onEdit,
  appearance = "default",
  passwordToggle = false,
  passwordToggleAria,
}: RhfTextFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          id={id}
          label={label}
          invalid={!!fieldState.error}
          touched={fieldState.isTouched}
          appearance={appearance}
          passwordToggle={passwordToggle}
          passwordToggleAria={passwordToggleAria}
          errorText={
            fieldState.error?.message ? translateError(fieldState.error.message) : null
          }
          inputProps={{
            name: field.name,
            ref: field.ref,
            type,
            autoComplete,
            placeholder,
            value: (field.value as string | undefined) ?? "",
            onBlur: field.onBlur,
            onChange: (e: ChangeEvent<HTMLInputElement>) => {
              field.onChange(e.target.value);
              onEdit?.();
            },
          }}
        />
      )}
    />
  );
}
