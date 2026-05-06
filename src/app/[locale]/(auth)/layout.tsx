import type { ReactNode } from "react";
import { AuthMarketingCarousel } from "@/features/auth/components/auth-marketing-carousel";
import { AuthPublicChrome } from "@/features/auth/components/auth-public-chrome";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      <AuthPublicChrome />

      {/* ── Left panel ── */}
      <div className="hidden w-[52%] lg:flex">
        <AuthMarketingCarousel />
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center bg-[#f8fafc] px-6 py-16">
        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  );
}