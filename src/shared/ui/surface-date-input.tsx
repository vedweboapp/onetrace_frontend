"use client";

import * as React from "react";
import { cn } from "@/core/utils/http.util";
import { surfaceInputClassName } from "./field-primitives";

/** Makes the invisible native picker control cover the full input (WebKit/Blink). */
export const nativeDatePickerHitAreaClassName = cn(
  "relative cursor-pointer",
  "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0",
  "[&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full",
  "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
);

/** Expands native picker hit area and opens calendar on any field click (not only the icon). */
export const surfaceDateInputClassName = cn(surfaceInputClassName, nativeDatePickerHitAreaClassName);

export function isNativeDateInputType(type: string | undefined): type is "date" | "datetime-local" | "time" {
  return type === "date" || type === "datetime-local" || type === "time";
}

export type SurfaceDateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type?: "date" | "datetime-local" | "time";
  invalid?: boolean;
};

export function openNativeDatePicker(el: HTMLInputElement | null) {
  if (!el || el.disabled) return;
  if (typeof el.showPicker === "function") {
    try {
      el.showPicker();
      return;
    } catch {
      /* Some browsers throw if not user-gesture or unsupported state */
    }
  }
  el.focus();
}

export const SurfaceDateInput = React.forwardRef<HTMLInputElement, SurfaceDateInputProps>(
  function SurfaceDateInput(
    { className, invalid, type = "date", onClick, disabled, readOnly, ...props },
    ref,
  ) {
    const innerRef = React.useRef<HTMLInputElement | null>(null);

    const setRefs = React.useCallback(
      (el: HTMLInputElement | null) => {
        innerRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      },
      [ref],
    );

    function openPickerFromEvent(e: { defaultPrevented: boolean }) {
      if (e.defaultPrevented || disabled || readOnly) return;
      openNativeDatePicker(innerRef.current);
    }

    function handleClick(e: React.MouseEvent<HTMLInputElement>) {
      onClick?.(e);
      openPickerFromEvent(e);
    }

    return (
      <input
        ref={setRefs}
        type={type}
        disabled={disabled}
        readOnly={readOnly}
        {...props}
        onClick={handleClick}
        className={cn(surfaceDateInputClassName, invalid && "border-red-500", className)}
      />
    );
  },
);
