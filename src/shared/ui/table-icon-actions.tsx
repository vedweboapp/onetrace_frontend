"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import { AppButton, type AppButtonProps } from "./app-button";

export function TableRowActions({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn("flex flex-nowrap items-center justify-end gap-1", className)} {...props} />;
}

type TableIconActionButtonProps = Omit<AppButtonProps, "children" | "size"> & {
  label: string;
  icon: ReactNode;
};

export function TableIconActionButton({
  label,
  icon,
  className,
  ...props
}: TableIconActionButtonProps) {
  return (
    <AppButton
      type="button"
      size="sm"
      aria-label={label}
      title={label}
      className={cn("size-9 min-w-9 shrink-0 gap-0 px-0 [&_svg]:size-[18px]", className)}
      {...props}
    >
      <span className="pointer-events-none flex items-center justify-center [&_svg]:shrink-0" aria-hidden>
        {icon}
      </span>
    </AppButton>
  );
}
