import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
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
