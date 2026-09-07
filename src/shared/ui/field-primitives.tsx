import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

export const fieldRequiredMarkClassName = "ml-0.5 text-red-600 dark:text-red-400";

export const fieldErrorTextClassName = "mt-1.5 text-sm text-red-600 dark:text-red-400";

export const fieldLabelClassName = cn(
  "field-label block font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide",
  "text-[length:var(--dash-label-size,0.875rem)]",
);

export const surfaceInputClassName = cn(
  "field-control h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 text-slate-900 outline-none transition",
  "text-[length:var(--dash-body-size,0.875rem)]",
  "placeholder:text-slate-400 focus-visible:border-[color:var(--dash-accent,#111111)] focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/20",
  "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500",
);

/** Apply on custom controls (select triggers, phone roots) so required red-line works when nested. */
export const fieldControlClassName = "field-control";

/** Multiline fields: no fixed height; caret and text start at the top. */
export const surfaceTextareaClassName = cn(
  surfaceInputClassName,
  "h-auto min-h-[5rem] resize-y py-2 leading-relaxed [field-sizing:content]",
);

export const surfaceSelectClassName = cn(
  surfaceInputClassName,
  "cursor-pointer appearance-none bg-slate-50/90 py-2.5 dark:bg-slate-900/70",
);

export function RequiredMark({ alwaysVisible }: { alwaysVisible?: boolean } = {}) {
  return (
    <span
      className={cn(
        fieldRequiredMarkClassName,
        !alwaysVisible && "field-required-asterisk",
      )}
      aria-hidden
    >
      *
    </span>
  );
}

export function FieldLabel({
  children,
  htmlFor,
  required,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn(fieldLabelClassName, className)}>
      {children}
      {required ? <RequiredMark /> : null}
    </label>
  );
}

/**
 * Labeled field wrapper. Layout (top/left/right) and required style
 * (asterisk / red line) follow Appearance settings via CSS data attributes
 * on `.dash-appearance-scope`.
 */
export function FieldGroup({
  label,
  htmlFor,
  required,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("field-group", required && "field-group--required", className)}
      data-required={required ? "true" : undefined}
    >
      <FieldLabel htmlFor={htmlFor} required={required}>
        {label}
      </FieldLabel>
      <div className="field-control-wrap min-w-0 flex-1">{children}</div>
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
