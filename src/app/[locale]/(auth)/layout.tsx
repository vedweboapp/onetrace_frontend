import type { ReactNode } from "react";
import { AuthPublicChrome } from "@/components/auth/auth-public-chrome";
import { AuthCard } from "@/shared/ui";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="scheme-light relative min-h-screen bg-white text-slate-900 [color-scheme:light]">
      <AuthPublicChrome />
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pb-16 pt-20 sm:px-6 sm:pb-12 sm:pt-16">
        <AuthCard>{children}</AuthCard>
      </div>
    </div>
  );
}
