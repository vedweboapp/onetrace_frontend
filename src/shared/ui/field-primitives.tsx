import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

export const fieldRequiredMarkClassName = "ml-0.5 text-red-600 dark:text-red-400";

export const fieldErrorTextClassName = "mt-1.5 text-sm text-red-600 dark:text-red-400";

export const fieldLabelClassName = cn(
  "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300",
);

export const surfaceInputClassName = cn(
  "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition",
  "placeholder:text-slate-400 focus-visible:border-[color:var(--dash-accent,#111111)] focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/20",
  "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500",
);


export const surfaceSelectClassName = cn(
  surfaceInputClassName,
  "cursor-pointer appearance-none bg-slate-50/90 py-2.5 dark:bg-slate-900/70",
);

export function FieldLabel({
  children,
  htmlFor,
  required,
}: {
  children: ReactNode;
  htmlFor?: string;
  
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className={fieldLabelClassName}>
      {children}
      {required ? (
        <span className={fieldRequiredMarkClassName} aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

export function FieldGroup({
  label,
  htmlFor,
  required,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <FieldLabel htmlFor={htmlFor} required={required}>
        {label}
      </FieldLabel>
      {children}
    </div>
  );
}

export function FieldErrorText({ id, children }: { id?: string; children?: ReactNode }) {
  if (children == null || children === "") return null;
  return (
    <p id={id} className={fieldErrorTextClassName} role="alert">
      {children}
    </p>
  );
}
