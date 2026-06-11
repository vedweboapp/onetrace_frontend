"use client";

import * as React from "react";
import { Button } from "@base-ui/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/core/utils/http.util";

const variants = {
  primary: cn(
    "bg-[color:var(--dash-accent,#111111)] text-[color:var(--dash-on-accent,#ffffff)] shadow-sm",
    "hover:brightness-110 active:brightness-[0.93]",
    "focus-visible:ring-[color:color-mix(in_srgb,var(--dash-accent,#111111)_42%,transparent)]",
    "dark:hover:brightness-110 dark:active:brightness-95",
  ),
  primaryLight: cn(
    "bg-[color:var(--dash-accent,#111111)] text-[color:var(--dash-on-accent,#ffffff)] shadow-sm",
    "hover:brightness-110 active:brightness-[0.93]",
    "focus-visible:ring-[color:color-mix(in_srgb,var(--dash-accent,#111111)_42%,transparent)]",
    "dark:hover:brightness-110 dark:active:brightness-95",
  ),
  secondary: cn(
    "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
    "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
    "focus-visible:ring-slate-400/45",
  ),
  secondaryLight: cn(
    "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
    "focus-visible:ring-slate-400/45",
  ),
  ghost: cn(
    "text-[color:var(--dash-accent,#111111)] hover:bg-[color:var(--dash-accent,#111111)]/10",
    "focus-visible:ring-[color:color-mix(in_srgb,var(--dash-accent,#111111)_42%,transparent)]",
  ),

  danger: cn(
    "bg-red-600 text-white shadow-sm hover:bg-red-700",
    "focus-visible:ring-red-400/40",
  ),
} as const;

/** Compact dashboard actions — text only, no icons. */
const sizes = {
  sm: "h-8 min-h-8 rounded-md px-3 text-xs font-medium",
  md: "h-9 min-h-9 rounded-md px-3.5 text-xs font-medium",
  lg: "h-10 min-h-10 rounded-lg px-4 text-sm font-medium",
} as const;

export type AppButtonVariant = keyof typeof variants;
export type AppButtonSize = keyof typeof sizes;

export type AppButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "className" | "type"
> & {
  className?: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
};

const base = cn(
  "inline-flex cursor-pointer items-center justify-center gap-1.5 transition outline-none",
  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
  "data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none data-[disabled]:opacity-55",
);

export function AppButton({
  className,
  variant = "primary",
  size = "sm",
  loading,
  disabled,
  type = "button",
  children,
  ...props
}: AppButtonProps) {
  return (
    <Button
      type={type}
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : children}
    </Button>
  );
}
