"use client";

import { LocaleSwitcher } from "@/shared/components/layout/locale-switcher";

export function AuthPublicChrome() {
  return (
    <div className="fixed top-3 right-3 z-10">
      <div className=" p-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <LocaleSwitcher tone="default" />
      </div>
    </div>
  );
}