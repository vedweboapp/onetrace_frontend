"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AppButton, type AppButtonProps } from "./app-button";

export type SubmitButtonProps = Omit<AppButtonProps, "type" | "variant"> & {
  loading?: boolean;
  appearance?: "default" | "light";
};


export function SubmitButton({
  className,
  loading,
  children,
  disabled,
  appearance = "default",
  ...props
}: SubmitButtonProps) {
  return (
    <AppButton
      type="submit"
      variant={appearance === "light" ? "primaryLight" : "primary"}
      size="md"
      loading={loading}
      disabled={disabled}
      className={cn("w-full", appearance === "light" && loading && "cursor-wait", className)}
      {...props}
    >
      {children}
    </AppButton>
  );
}
