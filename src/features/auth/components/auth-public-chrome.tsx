"use client";

import { LocaleSwitcher } from "@/shared/components/layout/locale-switcher";

export function AuthPublicChrome() {
  return (
    <div className="fixed top-3 right-3 z-10">
      <div className=" p-2">
        <LocaleSwitcher tone="default" />
      </div>
    </div>
  );
}