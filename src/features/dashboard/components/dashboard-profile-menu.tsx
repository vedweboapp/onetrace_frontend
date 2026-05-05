"use client";

import { LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { AppButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  initials: string;
  className?: string;
};

export function DashboardProfileMenu({ initials, className }: Props) {
  const t = useTranslations("Dashboard.header");
  const user = useAuthStore((s) => s.user);
  const { logout, isLoggingOut } = useLogout();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("openProfileMenu")}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-800 outline-none transition",
          "hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-slate-300",
          "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-600",
          open && "ring-2 ring-slate-300 dark:ring-slate-600",
        )}
      >
        {initials}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={t("profileMenuLabel")}
          className={cn(
            "absolute right-0 top-[calc(100%+0.375rem)] z-50 min-w-[12rem] rounded-lg border border-slate-200 bg-white p-2 shadow-lg",
            "dark:border-slate-700 dark:bg-slate-900",
          )}
        >
          {user?.email ? (
            <p className="truncate px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          ) : null}
          <AppButton
            type="button"
            role="menuitem"
            variant="ghost"
            size="sm"
            loading={isLoggingOut}
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className="w-full justify-start gap-2 text-slate-800 dark:text-slate-200"
          >
            <LogOut className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            {t("signOut")}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}
