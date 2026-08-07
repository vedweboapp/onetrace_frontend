"use client";

import * as React from "react";
import { useTheme } from "@teispace/next-themes";
import { useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname as useNextPathname } from "next/navigation";
import { stripLocaleSegmentsFromPathname } from "@/i18n/locale-path";
import { routing } from "@/i18n/routing";
import {
  ACCENT_ORDER,
  FONT_FAMILY_ORDER,
  FONT_SIZE_ORDER,
  FORM_LABEL_PLACEMENT_ORDER,
  REQUIRED_INDICATOR_ORDER,
  SIDEBAR_LAYOUT_ORDER,
  useDashboardAppearanceStore,
  type DashboardAccentId,
  type DashboardFontFamily,
  type DashboardFontSize,
  type DashboardSidebarLayout,
  type FormLabelPlacement,
  type RequiredFieldIndicator,
} from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import { ACCENT_HEX } from "@/features/dashboard/utils/accent-hex.util";
import { useShallow } from "zustand/react/shallow";
import { AppButton, CheckmarkSelect, FieldGroup, surfaceInputClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { LayoutPanelLeft, LayoutPanelTop, Moon, PanelRight, Sun } from "lucide-react";

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

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/50 sm:px-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          {title}
        </h2>
      </div>
      <div className="space-y-8 p-5 sm:p-6">{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ChoiceChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition",
        active
          ? "border-[color:var(--dash-accent)] bg-[color:var(--dash-accent)]/10 text-slate-900 dark:text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
        className,
      )}
    >
      {children}
    </button>
  );
}

function LayoutCard({
  active,
  onClick,
  title,
  subtitle,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-start gap-3 rounded-xl border p-4 text-left transition",
        active
          ? "border-[color:var(--dash-accent)] bg-[color:var(--dash-accent)]/5 ring-1 ring-[color:var(--dash-accent)]"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600",
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-lg border",
          active
            ? "border-[color:var(--dash-accent)]/40 bg-[color:var(--dash-accent)]/10 text-[color:var(--dash-accent)]"
            : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </button>
  );
}

function FormLayoutPreview({
  placement,
  requiredIndicator,
}: {
  placement: FormLabelPlacement;
  requiredIndicator: RequiredFieldIndicator;
}) {
  const t = useTranslations("Dashboard.appearance");
  return (
    <div
      className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40"
      data-form-label={placement}
      data-required-indicator={requiredIndicator}
    >
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {t("formPreviewHeading")}
      </p>
      <div className="dash-appearance-scope max-w-md" data-form-label={placement} data-required-indicator={requiredIndicator}>
        <FieldGroup label={t("formPreviewLabel")} htmlFor="appearance-preview-field" required>
          <input
            id="appearance-preview-field"
            type="text"
            readOnly
            value={t("formPreviewValue")}
            className={surfaceInputClassName}
          />
        </FieldGroup>
      </div>
    </div>
  );
}

export function AppearancePanel() {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const t = useTranslations("Dashboard.appearance");
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();
  const locale = useLocale();
  const nextPathname = useNextPathname();
  const colorInputRef = React.useRef<HTMLInputElement>(null);

  const {
    accentKind,
    accent,
    customAccentHex,
    fontFamily,
    fontSize,
    sidebarLayout,
    formLabelPlacement,
    requiredIndicator,
    setAccentPreset,
    setAccentCustom,
    setFontFamily,
    setFontSize,
    setSidebarLayout,
    setFormLabelPlacement,
    setRequiredIndicator,
  } = useDashboardAppearanceStore(
    useShallow((s) => ({
      accentKind: s.accentKind,
      accent: s.accent,
      customAccentHex: s.customAccentHex,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      sidebarLayout: s.sidebarLayout,
      formLabelPlacement: s.formLabelPlacement,
      requiredIndicator: s.requiredIndicator,
      setAccentPreset: s.setAccentPreset,
      setAccentCustom: s.setAccentCustom,
      setFontFamily: s.setFontFamily,
      setFontSize: s.setFontSize,
      setSidebarLayout: s.setSidebarLayout,
      setFormLabelPlacement: s.setFormLabelPlacement,
      setRequiredIndicator: s.setRequiredIndicator,
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

  const fontOptions = React.useMemo(
    () => FONT_FAMILY_ORDER.map((id) => ({ value: id, label: t(`fonts.${id}`) })),
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

  const layoutIcons: Record<DashboardSidebarLayout, React.ReactNode> = {
    lithium: <LayoutPanelLeft className="size-6" strokeWidth={1.5} />,
    hydrogen: <LayoutPanelTop className="size-6" strokeWidth={1.5} />,
    boron: <PanelRight className="size-6" strokeWidth={1.5} />,
  };

  return (
    <div
      className={cn(
        "w-full space-y-6 pb-10 transition-opacity duration-500",
        isMounted ? "opacity-100" : "opacity-0",
      )}
    >
      <SectionShell title={t("themeHeading")}>
        <SettingRow label={t("themeSelectLabel")} hint={t("themeHint")}>
          <div className="flex w-full max-w-sm items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            {(["light", "dark"] as const).map((mode) => {
              const active = (mounted ? theme : "light") === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all",
                    active
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {mode === "light" ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{t(`theme.${mode}`)}</span>
                </button>
              );
            })}
          </div>
        </SettingRow>

        <SettingRow label={t("languageSelectLabel")} hint={t("languageHint")}>
          <CheckmarkSelect
            id="appearance-locale"
            listLabel={t("languageSelectLabel")}
            options={languageOptions}
            value={locale}
            onChange={switchLocale}
            className="w-full max-w-md"
          />
        </SettingRow>

        <SettingRow label={t("accentPresetsLabel")} hint={t("customHint")}>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-5">
              {ACCENT_ORDER.map((id: DashboardAccentId) => {
                const hex = ACCENT_HEX[id];
                const selected = accentKind === "preset" && accent === id;
                return (
                  <div key={id} className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAccentPreset(id);
                        setHexDraft(hex);
                      }}
                      className={cn(
                        "size-10 rounded-full transition hover:scale-105",
                        selected
                          ? "ring-2 ring-[color:var(--dash-accent)] ring-offset-2 dark:ring-offset-slate-950"
                          : "ring-1 ring-slate-200 dark:ring-slate-700",
                      )}
                      style={{ background: hex }}
                      title={t(`accents.${id}`)}
                      aria-label={t(`accents.${id}`)}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-tight text-slate-500">
                      {t(`accents.${id}`)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="max-w-md">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("customHexLabel")}
              </p>
              <div className="flex overflow-hidden items-center rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-1 items-center gap-3 px-3 py-2">
                  <button
                    type="button"
                    className="size-6 rounded-md border border-slate-200 dark:border-slate-700"
                    style={{ background: normalizeHex(hexDraft) }}
                    onClick={() => colorInputRef.current?.click()}
                    aria-label={t("customColorPicker")}
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
                  className="mx-2 px-5 py-2 text-xs font-bold uppercase tracking-wider"
                >
                  {t("applyCustom")}
                </AppButton>
              </div>
            </div>
          </div>
        </SettingRow>
      </SectionShell>

      <SectionShell title={t("typographyHeading")}>
        <SettingRow label={t("fontFamilyLabel")} hint={t("fontFamilyHint")}>
          <CheckmarkSelect
            id="appearance-font-family"
            listLabel={t("fontFamilyLabel")}
            options={fontOptions}
            value={fontFamily}
            onChange={(v) => setFontFamily(v as DashboardFontFamily)}
            className="w-full max-w-md"
          />
        </SettingRow>

        <SettingRow label={t("fontSizeLabel")} hint={t("fontSizeHint")}>
          <div className="flex flex-wrap gap-2">
            {FONT_SIZE_ORDER.map((size: DashboardFontSize) => (
              <ChoiceChip
                key={size}
                active={fontSize === size}
                onClick={() => setFontSize(size)}
              >
                {t(`fontSizes.${size}`)}
              </ChoiceChip>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {t("fontSizePreview")}
          </p>
        </SettingRow>
      </SectionShell>

      <SectionShell title={t("layoutHeading")}>
        <SettingRow label={t("sidebarLayoutLabel")} hint={t("sidebarLayoutHint")}>
          <div className="grid gap-3 sm:grid-cols-3">
            {SIDEBAR_LAYOUT_ORDER.map((layout: DashboardSidebarLayout) => (
              <LayoutCard
                key={layout}
                active={sidebarLayout === layout}
                onClick={() => setSidebarLayout(layout)}
                title={t(`layouts.${layout}.title`)}
                subtitle={t(`layouts.${layout}.subtitle`)}
                icon={layoutIcons[layout]}
              />
            ))}
          </div>
        </SettingRow>
      </SectionShell>

      <SectionShell title={t("formLayoutHeading")}>
        <SettingRow label={t("labelPlacementLabel")} hint={t("labelPlacementHint")}>
          <div className="flex flex-wrap gap-2">
            {FORM_LABEL_PLACEMENT_ORDER.map((placement: FormLabelPlacement) => (
              <ChoiceChip
                key={placement}
                active={formLabelPlacement === placement}
                onClick={() => setFormLabelPlacement(placement)}
              >
                {t(`labelPlacements.${placement}`)}
              </ChoiceChip>
            ))}
          </div>
        </SettingRow>

        <SettingRow label={t("requiredIndicatorLabel")} hint={t("requiredIndicatorHint")}>
          <div className="flex flex-wrap gap-2">
            {REQUIRED_INDICATOR_ORDER.map((indicator: RequiredFieldIndicator) => (
              <ChoiceChip
                key={indicator}
                active={requiredIndicator === indicator}
                onClick={() => setRequiredIndicator(indicator)}
              >
                {t(`requiredIndicators.${indicator}`)}
              </ChoiceChip>
            ))}
          </div>
        </SettingRow>

        <FormLayoutPreview
          placement={formLabelPlacement}
          requiredIndicator={requiredIndicator}
        />
      </SectionShell>
    </div>
  );
}
