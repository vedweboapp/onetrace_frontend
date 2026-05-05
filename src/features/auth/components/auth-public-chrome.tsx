"use client";

import { LocaleSwitcher } from "@/shared/components/layout/locale-switcher";
export function AuthPublicChrome() {
  return (
    <header className="absolute left-0 right-0 top-0 z-10 flex justify-end border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
      <LocaleSwitcher tone="default" />
    </header>
  );
}
