"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { stripLocaleSegmentsFromPathname } from "@/i18n/locale-path";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  className?: string;
  tone?: "default" | "light";
};

export function LocaleSwitcher({ className, tone = "default" }: LocaleSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className={cn("flex items-center gap-2 text-sm", className)}>
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(e) => {
          const bare = stripLocaleSegmentsFromPathname(pathname);
          router.replace(bare, { locale: e.target.value });
          router.refresh();
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
