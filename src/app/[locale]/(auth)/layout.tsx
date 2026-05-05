import type { ReactNode } from "react";
import { AuthCard } from "@/shared/ui";
import { AuthPublicChrome } from "@/features/auth/components/auth-public-chrome";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <AuthPublicChrome />
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pb-16 pt-20 sm:px-6 sm:pb-12 sm:pt-16">
        <AuthCard>{children}</AuthCard>
      </div>
    </div>
  );
}
