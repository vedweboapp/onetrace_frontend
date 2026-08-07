"use client";

import { BookOpen, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { AuthUser } from "@/features/auth/types/auth.types";
import { Link } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";

type Props = {
  initials: string;
  className?: string;
};

/** Prefer real name; never reuse the email as the display name (avoids email shown twice). */
export function authDisplayName(user: AuthUser | null | undefined): string {
  if (!user) return "";
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  const u = user.username?.trim() ?? "";
  const email = user.email?.trim() ?? "";
  if (u && u.toLowerCase() !== email.toLowerCase() && !u.includes("@")) return u;
  return "";
}

function roleLabel(
  user: AuthUser | null | undefined,
  orgRole: string | undefined,
): string | undefined {
  const fromUser = user?.role_name?.trim() || user?.role?.trim();
  if (fromUser) return fromUser;
  if (orgRole?.trim()) return orgRole.trim();
  return undefined;
}

export function DashboardProfileMenu({ initials, className }: Props) {
  const t = useTranslations("Dashboard.header");
  const tSettingsNav = useTranslations("Dashboard.settingsNav");
  const user = useAuthStore((s) => s.user);
  const organizations = useAuthStore((s) => s.organizations);
  const { logout, isLoggingOut } = useLogout();
  const documentationHref = routes.dashboard.documentation;
  const profileHref = routes.dashboard.settingsPersonalProfile;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const org = organizations[0];
  const name = authDisplayName(user);
  const role = roleLabel(
    user,
    org?.role_name?.trim() || org?.role?.trim() || undefined,
  );
  const orgName = org?.organization_name?.trim();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass = cn(
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 transition",
    "hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
    "outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800",
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("openProfileMenu")}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold tracking-wide text-slate-800 outline-none transition",
          "hover:border-slate-300 hover:bg-slate-200/80",
          "focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
          "dark:focus-visible:ring-slate-600 dark:focus-visible:ring-offset-slate-950",
          open && "ring-2 ring-slate-300 ring-offset-2 ring-offset-white dark:ring-slate-600 dark:ring-offset-slate-950",
        )}
      >
        {initials}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={t("profileMenuLabel")}
          className={cn(
            "absolute right-0 top-[calc(100%+0.5rem)] z-[999] w-[17.5rem] overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-lg ring-1 ring-black/5",
            "dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10",
          )}
        >
          <div className="border-b border-slate-100 px-3.5 py-3 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  "bg-[color:var(--dash-accent,#111111)] text-[color:var(--dash-on-accent,#ffffff)]",
                )}
                aria-hidden
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                {name ? (
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {name}
                  </p>
                ) : null}
                {user?.email ? (
                  <p
                    className={cn(
                      "truncate text-xs text-slate-500 dark:text-slate-400",
                      name ? "mt-0.5" : "text-sm font-semibold text-slate-900 dark:text-slate-100",
                    )}
                  >
                    {user.email}
                  </p>
                ) : null}
                {role || orgName ? (
                  <p className="mt-1.5 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {[role, orgName].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <UserRound className="size-4 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden />
              {t("myProfile")}
            </Link>
            <Link
              href={documentationHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <BookOpen className="size-4 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden />
              {tSettingsNav("documentation")}
            </Link>
          </div>

          <div className="border-t border-slate-100 p-1.5 dark:border-slate-800">
            <button
              type="button"
              role="menuitem"
              disabled={isLoggingOut}
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className={cn(
                itemClass,
                "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40",
                isLoggingOut && "pointer-events-none opacity-60",
              )}
            >
              <LogOut className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              {isLoggingOut ? t("signingOut") : t("signOut")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
