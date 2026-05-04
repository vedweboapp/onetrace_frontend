"use client";

import * as React from "react";
import { useTheme } from "@teispace/next-themes";
import { useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { stripLocaleSegmentsFromPathname } from "@/i18n/locale-path";
import { routing } from "@/i18n/routing";
import {
  ACCENT_ORDER,
  useDashboardAppearanceStore,
} from "@/features/dashboard/store/dashboard-appearance-store";
import { accentSwatchClass } from "@/features/dashboard/lib/accent-styles";
import { CheckmarkSelect } from "@/shared/ui/checkmark-select";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function normalizeHexInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "#4f46e5";
  const withHash = t.startsWith("#") ? t : `#${t}`;
  return withHash.length === 4
    ? `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`.toLowerCase()
    : withHash.slice(0, 7).toLowerCase();
}

export function AppearancePanel() {
  const t = useTranslations("Dashboard.appearance");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useIsClient();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const { accentKind, accent, customAccentHex, setAccentPreset, setAccentCustom } =
    useDashboardAppearanceStore(
      useShallow((s) => ({
        accentKind: s.accentKind,
        accent: s.accent,
        customAccentHex: s.customAccentHex,
        setAccentPreset: s.setAccentPreset,
        setAccentCustom: s.setAccentCustom,
      })),
    );

  const [hexDraft, setHexDraft] = React.useState(customAccentHex);

  React.useEffect(() => {
    setHexDraft(customAccentHex);
  }, [customAccentHex]);

  React.useEffect(() => {
    if (!mounted) return;
    if (theme === "system") {
      setTheme("light");
    }
  }, [mounted, theme, setTheme]);

  const themeOptions = React.useMemo(
    () =>
      (["light", "dark"] as const).map((value) => ({
        value,
        label: t(`theme.${value}`),
      })),
    [t],
  );

  const languageOptions = React.useMemo(
    () =>
      routing.locales.map((loc) => ({
        value: loc,
        label: t(`languages.${loc}`),
      })),
    [t],
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200/90 border-l-4 border-l-[color:var(--dash-accent)] bg-white p-6 pl-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {t("themeHeading")}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("themeHint")}</p>
        </div>
        {!mounted ? (
          <div className="h-11 max-w-md rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900" />
        ) : (
          <CheckmarkSelect
            label={t("themeSelectLabel")}
            listLabel={t("themeHeading")}
            options={themeOptions}
            value={(theme ?? resolvedTheme) === "dark" ? "dark" : "light"}
            onChange={(v) => setTheme(v === "dark" ? "dark" : "light")}
          />
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/90 border-l-4 border-l-[color:var(--dash-accent)] bg-white p-6 pl-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {t("languageHeading")}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("languageHint")}</p>
        </div>
        <CheckmarkSelect
          label={t("languageSelectLabel")}
          listLabel={t("languageHeading")}
          options={languageOptions}
          value={locale}
          onChange={(next) => {
            const bare = stripLocaleSegmentsFromPathname(pathname);
            router.replace(bare, { locale: next });
            router.refresh();
          }}
        />
      </section>

      <section className="rounded-2xl border border-slate-200/90 border-l-4 border-l-[color:var(--dash-accent)] bg-white p-6 pl-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {t("accentHeading")}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("accentHint")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ACCENT_ORDER.map((id) => {
            const selected = accentKind === "preset" && accent === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAccentPreset(id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition",
                  selected
                    ? "border-[color:var(--dash-accent)] ring-2 ring-[color:var(--dash-accent)]/25 dark:ring-[color:var(--dash-accent)]/35"
                    : "border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600",
                )}
                aria-pressed={selected}
              >
                <span
                  className={cn(
                    "size-10 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950",
                    accentSwatchClass(id),
                    selected ? "ring-[color:var(--dash-accent)]" : "ring-transparent",
                  )}
                  aria-hidden
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {t(`accents.${id}`)}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setAccentCustom(hexDraft)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition",
              accentKind === "custom"
                ? "border-[color:var(--dash-accent)] ring-2 ring-[color:var(--dash-accent)]/25 dark:ring-[color:var(--dash-accent)]/35"
                : "border-dashed border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900/30 dark:hover:border-slate-500",
            )}
            aria-pressed={accentKind === "custom"}
          >
            <span
              className="flex size-10 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
              style={{ backgroundColor: normalizeHexInput(hexDraft) }}
              aria-hidden
            />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {t("accentCustom")}
            </span>
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 border-l-4 border-l-[color:var(--dash-accent)] bg-slate-50 p-4 pl-4 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("customHexLabel")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={normalizeHexInput(hexDraft).slice(0, 7)}
              onChange={(e) => {
                setHexDraft(e.target.value);
                setAccentCustom(e.target.value);
              }}
              className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-600"
              aria-label={t("customColorPicker")}
            />
            <input
              type="text"
              value={hexDraft}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={() => {
                const n = normalizeHexInput(hexDraft);
                if (/^#[0-9a-f]{6}$/i.test(n)) {
                  setAccentCustom(n);
                } else {
                  setHexDraft(customAccentHex);
                }
              }}
              className="h-11 min-w-[8rem] flex-1 rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 outline-none focus-visible:border-[color:var(--dash-accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent)]/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              spellCheck={false}
              placeholder="#4f46e5"
            />
            <button
              type="button"
              onClick={() => setAccentCustom(normalizeHexInput(hexDraft))}
              className="h-11 shrink-0 rounded-xl bg-[color:var(--dash-accent,#4f46e5)] px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:opacity-85"
            >
              {t("applyCustom")}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("customHint")}</p>
        </div>
      </section>
    </div>
  );
}
