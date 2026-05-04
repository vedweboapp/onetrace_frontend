import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formAlertClassName, formAlertClassNameLight } from "./class-names";

type FormAlertProps = {
  children: ReactNode;
  className?: string;
  tone?: "default" | "light";
};

export function FormAlert({ children, className, tone = "default" }: FormAlertProps) {
  return (
    <p
      role="alert"
      className={cn(tone === "light" ? formAlertClassNameLight : formAlertClassName, className)}
    >
      {children}
    </p>
  );
}
