"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/core/utils/http.util";

type LocaleSwitcherProps = {
  className?: string;
  tone?: "default" | "light";
};

export function LocaleSwitcher({ className, tone = "default" }: LocaleSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className={cn("flex items-center gap-2 text-sm", className)}>
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(e) => {
          const nextLocale = e.target.value;
          if (nextLocale === locale) return;
          router.replace(pathname, { locale: nextLocale });
        }}
        className={cn(
          "h-9 rounded-lg border px-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-slate-200",
          tone === "light"
            ? "border-slate-200 bg-white text-slate-800 focus-visible:border-slate-300"
            : "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-slate-700",
        )}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {loc.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
