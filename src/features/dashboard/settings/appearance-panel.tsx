"use client";

import * as React from "react";
import { usePathname as useNextPathname } from "next/navigation";
import { useTheme } from "@teispace/next-themes";
import { useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { stripLocaleSegmentsFromPathname } from "@/i18n/locale-path";
import { routing } from "@/i18n/routing";
import type { DashboardAccentId } from "@/features/dashboard/store/dashboard-appearance.store";
import { useDashboardAppearanceStore } from "@/features/dashboard/store/dashboard-appearance.store";
import { ACCENT_HEX } from "@/features/dashboard/utils/accent-hex.util";
import { useShallow } from "zustand/react/shallow";
import { CheckmarkSelect, ListPageHeader } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type ThemeMode = "light" | "dark";

const PRESET_ACCENTS: { id: DashboardAccentId; hex: string }[] = [
  { id: "black", hex: ACCENT_HEX.black },
  { id: "indigo", hex: ACCENT_HEX.indigo },
  { id: "teal", hex: ACCENT_HEX.teal },
  { id: "violet", hex: ACCENT_HEX.violet },
  { id: "emerald", hex: ACCENT_HEX.emerald },
];

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function normalizeHex(raw: string): string {
  const t = raw.trim();
  if (!t) return "#111111";
  const h = t.startsWith("#") ? t : `#${t}`;
  if (h.length === 4) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
  }
  return h.slice(0, 7).toLowerCase();
}

function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

function SectionShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
      <div className="mb-5 max-w-2xl xl:max-w-4xl">
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h2>
        {hint ? (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function AppearancePanel() {
  const t = useTranslations("Dashboard.appearance");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useIsClient();
  const locale = useLocale();
  const nextPathname = useNextPathname();

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync draft from store
    setHexDraft(customAccentHex);
  }, [customAccentHex]);

  React.useEffect(() => {
    if (!mounted) return;
    if (theme === "system") setTheme("light");
  }, [mounted, theme, setTheme]);

  const currentTheme: ThemeMode = (theme ?? resolvedTheme) === "dark" ? "dark" : "light";

  const activeHex = React.useMemo(() => {
    if (accentKind === "preset") {
      return PRESET_ACCENTS.find((p) => p.id === accent)?.hex ?? "#533ab7";
    }
    return normalizeHex(customAccentHex);
  }, [accentKind, accent, customAccentHex]);

  const languageOptions = React.useMemo(
    () => routing.locales.map((loc) => ({ value: loc, label: t(`languages.${loc}`) })),
    [t],
  );

  function handleApplyCustom() {
    const n = normalizeHex(hexDraft);
    if (isValidHex(n)) setAccentCustom(n);
    else setHexDraft(customAccentHex);
  }

  function switchLocale(nextLocale: string) {
    if (nextLocale === locale) return;
    const bare = stripLocaleSegmentsFromPathname(nextPathname);
    const path = bare === "/" ? "" : bare;
    const suffix =
      typeof window !== "undefined"
        ? `${window.location.search}${window.location.hash}`
        : "";
    window.location.assign(`/${nextLocale}${path}${suffix}`);
  }

  return (
    <div className="space-y-6">
      <ListPageHeader title={t("title")} description={t("subtitle")} showViewToggle={false} />
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm",
          "ring-1 ring-slate-950/[0.03] dark:border-slate-800 dark:bg-slate-950 dark:ring-white/[0.04]",
        )}
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-800/90">
          <SectionShell title={t("themeHeading")} hint={t("themeHint")}>
            {!mounted ? (
              <div className="h-14 max-w-md rounded-xl bg-slate-100 dark:bg-slate-800" />
            ) : (
              <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:max-w-xl lg:max-w-2xl">
                {(["light", "dark"] as const).map((mode) => {
                  const active = currentTheme === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTheme(mode)}
                      className={cn(
                        "relative flex flex-col items-start gap-3 rounded-xl border px-4 py-4 text-left transition-all",
                        active
                          ? "border-[color:var(--dash-accent)] bg-slate-50/90 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)] dark:bg-slate-900/50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-500 dark:hover:bg-slate-800/70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-10 items-center justify-center rounded-lg border text-slate-600 dark:text-slate-300",
                          active
                            ? "border-[color:var(--dash-accent)]/50 bg-white dark:bg-slate-900"
                            : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60",
                        )}
                      >
                        {mode === "light" ? (
                          <SunIcon className="size-5 shrink-0" />
                        ) : (
                          <MoonIcon className="size-5 shrink-0" />
                        )}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {t(`theme.${mode}`)}
                      </span>
                      {active ? (
                        <span
                          className="absolute right-3 top-3 size-2 rounded-full ring-2 ring-white dark:ring-slate-950"
                          style={{ background: activeHex }}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </SectionShell>

          <SectionShell title={t("languageHeading")} hint={t("languageHint")}>
            <CheckmarkSelect
              id="appearance-locale"
              label={t("languageSelectLabel")}
              listLabel={t("languageSelectLabel")}
              options={languageOptions}
              value={locale}
              onChange={switchLocale}
              className="w-full max-w-md sm:max-w-lg lg:max-w-xl"
            />
          </SectionShell>

          <SectionShell title={t("accentHeading")}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
              <div>
                <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">{t("accentPresetsLabel")}</p>
                <div className="flex flex-wrap gap-4">
                  {PRESET_ACCENTS.map(({ id, hex }) => {
                    const selected = accentKind === "preset" && accent === id;
                    return (
                      <div key={id} className="flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAccentPreset(id)}
                          title={t(`accents.${id}`)}
                          aria-pressed={selected}
                          aria-label={t(`accents.${id}`)}
                          className={cn(
                            "size-11 rounded-full border-2 border-transparent shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                            "hover:scale-[1.03] active:scale-100",
                            selected
                              ? "ring-2 ring-[color:var(--dash-accent)] ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
                              : "hover:ring-2 hover:ring-slate-300/70 dark:hover:ring-slate-600/60",
                          )}
                          style={{ background: hex }}
                        />
                        <span className="max-w-[4.5rem] truncate text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {t(`accents.${id}`)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="min-w-0 flex-1 lg:max-w-md xl:max-w-lg">
                <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">{t("accentCustomLabel")}</p>
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 sm:flex-1">
                    <input
                      type="color"
                      value={normalizeHex(hexDraft).slice(0, 7)}
                      onChange={(e) => {
                        setHexDraft(e.target.value);
                        setAccentCustom(e.target.value);
                      }}
                      className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-600"
                      aria-label={t("customColorPicker")}
                    />
                    <input
                      type="text"
                      value={hexDraft}
                      onChange={(e) => setHexDraft(e.target.value)}
                      onBlur={handleApplyCustom}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleApplyCustom();
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-[color:var(--dash-accent)] focus:ring-2 focus:ring-[color:var(--dash-accent)]/15 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="#111111"
                      spellCheck={false}
                      aria-label={t("customHexLabel")}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCustom}
                    className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:opacity-80 sm:self-stretch"
                    style={{ background: activeHex }}
                  >
                    {t("applyCustom")}
                  </button>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t("customHint")}</p>
              </div>
            </div>
          </SectionShell>
        </div>
      </div>
    </div>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
