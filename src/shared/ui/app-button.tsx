"use client";

import * as React from "react";
import { Button } from "@base-ui/react";
import { cn } from "@/lib/utils";

const variants = {
  primary: cn(
    "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
    "dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
  ),

  primaryLight: cn("bg-slate-900 text-white shadow-sm hover:bg-slate-800"),
  secondary: cn(
    "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
    "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  ),
  secondaryLight: cn(
    "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
  ),
  ghost: cn(
    "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  ),
  danger: cn("bg-red-600 text-white shadow-sm hover:bg-red-700"),
} as const;

const sizes = {
  sm: "h-9 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-11 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-5 text-base",
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
  "inline-flex items-center justify-center font-medium transition outline-none",
  "focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  "dark:focus-visible:ring-offset-slate-950",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-55",
);

export function AppButton({
  className,
  variant = "primary",
  size = "md",
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
      {children}
    </Button>
  );
}
