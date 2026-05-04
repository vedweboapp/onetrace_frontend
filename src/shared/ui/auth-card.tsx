import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { authCardClassName } from "./class-names";

type AuthCardProps = {
  children: ReactNode;
  className?: string;
};

export function AuthCard({ children, className }: AuthCardProps) {
  return <div className={cn(authCardClassName, className)}>{children}</div>;
}
