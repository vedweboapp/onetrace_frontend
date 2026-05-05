"use client";

import * as React from "react";
import { Field, Input } from "@base-ui/react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/core/utils/http.util";


export const textFieldInputClassName = cn(
  "h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 antialiased shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition",
  "border-slate-200/90 placeholder:text-slate-400",
  "hover:border-slate-300",
  "focus-visible:border-slate-400 focus-visible:ring-[3px] focus-visible:ring-slate-900/10",
  "dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500",
  "dark:hover:border-slate-600",
  "dark:focus-visible:border-slate-500 dark:focus-visible:ring-white/10",
  "data-[invalid]:border-red-400 data-[invalid]:focus-visible:border-red-400 data-[invalid]:focus-visible:ring-red-500/15",
  "dark:data-[invalid]:border-red-500",
);

export const textFieldInputClassNameLight = cn(
  "h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm antialiased shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition",
  "border-slate-200 bg-white text-slate-900",
  "placeholder:text-slate-400",
  "hover:border-slate-300",
  "focus-visible:border-slate-400 focus-visible:ring-[3px] focus-visible:ring-slate-900/10",
  "data-[invalid]:border-red-400 data-[invalid]:focus-visible:border-red-400 data-[invalid]:focus-visible:ring-red-500/15",
  "dark:border-slate-200 dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-400",
  "dark:hover:border-slate-300",
  "dark:focus-visible:border-slate-400 dark:focus-visible:ring-slate-900/10",
  "dark:data-[invalid]:border-red-400",
);

const labelClassName = cn(
  "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300",
);

const labelClassNameLight = cn("mb-1.5 block text-sm font-medium text-slate-700");

const errorClassName = cn("mt-1.5 text-sm font-medium text-red-600 dark:text-red-400");
const errorClassNameLight = cn("mt-1.5 text-sm font-medium text-red-600");

export type TextFieldProps = {
  id: string;
  label: React.ReactNode;
  errorText?: string | null;
  invalid: boolean;
  touched?: boolean;
  inputProps: Omit<React.ComponentProps<typeof Input>, "id" | "className">;
  appearance?: "default" | "light";
  passwordToggle?: boolean;
  passwordToggleAria?: { show: string; hide: string };
};


export function TextField({
  id,
  label,
  errorText,
  invalid,
  touched,
  inputProps,
  appearance = "default",
  passwordToggle = false,
  passwordToggleAria = { show: "Show password", hide: "Hide password" },
}: TextFieldProps) {
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const inputCn =
    appearance === "light" ? textFieldInputClassNameLight : textFieldInputClassName;
  const labelCn = appearance === "light" ? labelClassNameLight : labelClassName;
  const errCn = appearance === "light" ? errorClassNameLight : errorClassName;

  const usePasswordToggle = passwordToggle && inputProps.type === "password";
  const effectiveType = usePasswordToggle
    ? passwordVisible
      ? "text"
      : "password"
    : inputProps.type;

  const toggleBtnClass = cn(
    "absolute right-1 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg outline-none transition",
    "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
    "focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-0",
    "dark:text-slate-600 dark:hover:bg-slate-100 dark:hover:text-slate-900",
  );

  const inputElement = (
    <Input
      id={id}
      className={cn(inputCn, usePasswordToggle && "pr-11")}
      {...inputProps}
      type={effectiveType}
    />
  );

  return (
    <Field.Root invalid={invalid} touched={touched} name={inputProps.name}>
      <Field.Label htmlFor={id} className={labelCn}>
        {label}
      </Field.Label>
      {usePasswordToggle ? (
        <div className="relative">
          {inputElement}
          <button
            type="button"
            className={toggleBtnClass}
            aria-label={passwordVisible ? passwordToggleAria.hide : passwordToggleAria.show}
            aria-pressed={passwordVisible}
            aria-controls={id}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPasswordVisible((v) => !v)}
          >
            {passwordVisible ? (
              <EyeOff className="size-[1.125rem] shrink-0" strokeWidth={2} aria-hidden />
            ) : (
              <Eye className="size-[1.125rem] shrink-0" strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>
      ) : (
        inputElement
      )}
      {errorText ? (
        <Field.Error match className={errCn}>
          {errorText}
        </Field.Error>
      ) : null}
    </Field.Root>
  );
}
