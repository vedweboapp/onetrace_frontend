"use client";

import * as React from "react";
import { useTheme } from "@teispace/next-themes";
import { useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname as useNextPathname } from "next/navigation";
import { stripLocaleSegmentsFromPathname } from "@/i18n/locale-path";
import { routing } from "@/i18n/routing";
import type { DashboardAccentId } from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import { useDashboardAppearanceStore } from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import { ACCENT_HEX } from "@/features/dashboard/utils/accent-hex.util";
import { useShallow } from "zustand/react/shallow";
import { AppButton, CheckmarkSelect, ListPageHeader } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { Monitor, Moon, Sun } from "lucide-react";

const PRESET_ACCENTS: { id: DashboardAccentId; hex: string; label: string }[] = [
  { id: "black", hex: ACCENT_HEX.black, label: "Black" },
  { id: "indigo", hex: ACCENT_HEX.indigo, label: "Indigo" },
  { id: "teal", hex: ACCENT_HEX.teal, label: "Teal" },
  { id: "violet", hex: ACCENT_HEX.violet, label: "Violet" },
  { id: "emerald", hex: ACCENT_HEX.emerald, label: "Emerald" },
];

function useIsClient() {
  return useSyncExternalStore(
    () => () => { },
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{title}</h2>
      </div>
      <div className="p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}

export function AppearancePanel() {
  const t = useTranslations("Dashboard.appearance");
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();
  const locale = useLocale();
  const nextPathname = useNextPathname();
  const colorInputRef = React.useRef<HTMLInputElement>(null);

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
    <div className="w-full space-y-8 pb-10">
      <ListPageHeader variant="page" title={t("title")} description={t("subtitle")} showViewToggle={false} />

      {/* Workspace Preferences */}
      <SectionShell title="Workspace Preferences">
        <div className="space-y-8">
          {/* Theme Selector */}
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Interface Theme</p>
            <div className="flex w-full max-w-sm items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              {(["light", "dark", "system"] as const).map((mode) => {
                const active = theme === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all",
                      active
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    {mode === "light" && <Sun size={16} />}
                    {mode === "dark" && <Moon size={16} />}
                    {mode === "system" && <Monitor size={16} />}
                    <span className="capitalize">{mode}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Language Selector */}
            <CheckmarkSelect
              id="appearance-locale"
              label="SYSTEM LANGUAGE"
              listLabel="System Language"
              options={languageOptions}
              value={locale}
              onChange={switchLocale}
              className="w-full max-w-md"
            />
          </div>
        </div>
      </SectionShell>

      {/* Branding & Appearance */}
      <SectionShell title="Branding & Appearance">
        <div className="space-y-10">
          <div>
            <p className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Accent Color Presets</p>
            <div className="flex flex-wrap gap-8">
              {PRESET_ACCENTS.map(({ id, hex, label }) => {
                const selected = accentKind === "preset" && accent === id;
                return (
                  <div key={id} className="flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAccentPreset(id);
                        setHexDraft(hex);
                      }}
                      className={cn(
                        "group relative flex size-12 items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95",
                        selected ? "ring-2 ring-slate-900 ring-offset-4 dark:ring-white dark:ring-offset-slate-950" : "hover:ring-2 hover:ring-slate-200 dark:hover:ring-slate-800"
                      )}
                      style={{ background: hex }}
                    >
                      {selected && (
                        <div className="flex size-5 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-white">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </button>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-tight transition-colors",
                      selected ? "text-slate-900 dark:text-white" : "text-slate-400"
                    )}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Custom Hex Color</p>
            <div className="max-w-md space-y-3">
              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3 px-3 py-2 flex-1">
                  <div
                    className="size-6 rounded-md border border-slate-200 cursor-pointer dark:border-slate-700 hover:scale-110 transition"
                    style={{ background: normalizeHex(hexDraft) }}
                    onClick={() => colorInputRef.current?.click()}
                  />
                  <input
                    ref={colorInputRef}
                    type="color"
                    className="sr-only"
                    value={normalizeHex(hexDraft).slice(0, 7)}
                    onChange={(e) => {
                      setHexDraft(e.target.value);
                      setAccentCustom(e.target.value);
                    }}
                  />
                  <input
                    type="text"
                    value={hexDraft}
                    onChange={(e) => setHexDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCustom()}
                    className="w-full bg-transparent font-mono text-sm font-semibold outline-none text-slate-900 dark:text-white"
                    placeholder="#111111"
                    spellCheck={false}
                  />
                </div>
                <AppButton
                  variant="primary"
                  type="button"
                  onClick={handleApplyCustom}
                  style={{ background: normalizeHex(hexDraft) }}
                  className="px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:opacity-90 dark:text-black"
                >
                  Apply
                </AppButton>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Enter a custom hex code to match your brand's identity exactly.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>
    </div>
  );
}
