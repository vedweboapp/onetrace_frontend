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
  DETAIL_ROW_LINE_STYLE_ORDER,
  DETAIL_ROW_LINE_WIDTH_ORDER,
  FONT_FAMILY_ORDER,
  FONT_SIZE_PX_OPTIONS,
  FORM_LABEL_PLACEMENT_ORDER,
  REQUIRED_INDICATOR_ORDER,
  SIDEBAR_LAYOUT_ORDER,
  useDashboardAppearanceStore,
  type DashboardAccentId,
  type DashboardFontFamily,
  type DashboardSidebarLayout,
  type DetailRowLineStyle,
  type DetailRowLineWidth,
  type FormLabelPlacement,
  type RequiredFieldIndicator,
} from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import { ACCENT_HEX, accentOnAccentHex } from "@/features/dashboard/utils/accent-hex.util";
import { useShallow } from "zustand/react/shallow";
import { AppButton, CheckmarkSelect, FieldGroup, surfaceInputClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { Check, LayoutPanelLeft, LayoutPanelTop, Moon, PanelRight, Sun } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { updatePersonalProfile } from "../api/personal-profile.api";
import {
  buildApiAppearancePreferences,
  captureAppearanceStoreSnapshot,
  type AppearanceStoreSlice,
  type ApiAppearancePreferences,
} from "../utils/appearance-preferences.util";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";

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
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition",
        active
          ? "border-[color:var(--dash-accent)] bg-[color:var(--dash-accent)]/10 text-slate-900 dark:text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
        disabled && "pointer-events-none cursor-default opacity-80",
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
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-start gap-3 rounded-xl border p-4 text-left transition",
        active
          ? "border-[color:var(--dash-accent)] bg-[color:var(--dash-accent)]/5 ring-1 ring-[color:var(--dash-accent)]"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600",
        disabled && "pointer-events-none cursor-default opacity-80",
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
      <div
        className={cn(
          "dash-appearance-scope w-full max-w-2xl",
          /* Keep the sample label on one line beside the control in left/right layouts. */
          "[&_.field-group:not(.detail-field)>.field-label]:whitespace-nowrap",
          "[&_.field-group:not(.detail-field)>.field-label]:overflow-visible",
          "[&_.field-group:not(.detail-field)>.field-label]:[overflow-wrap:normal]",
        )}
        style={{ ["--form-label-col" as string]: "10.5rem" }}
        data-form-label={placement}
        data-required-indicator={requiredIndicator}
      >
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

export type AppearancePanelHandle = {
  submit: () => Promise<void>;
  cancel: () => void;
};

type AppearancePanelProps = {
  isEditing: boolean;
  isSaving: boolean;
  setIsSaving: (v: boolean) => void;
  onSaved?: () => void;
  /** Preserve server error_message when patching preferences. */
  initialErrorMessage?: ApiAppearancePreferences["error_message"];
};

type AppearanceEditSnapshot = {
  store: AppearanceStoreSlice;
  themeMode: "light" | "dark";
  language: string;
  hexDraft: string;
};

export const AppearancePanel = React.forwardRef<AppearancePanelHandle, AppearancePanelProps>(
  function AppearancePanel(
    { isEditing, isSaving, setIsSaving, onSaved, initialErrorMessage },
    ref,
  ) {
    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => {
      setIsMounted(true);
    }, []);

    const t = useTranslations("Dashboard.appearance");
    const tProfile = useTranslations("Dashboard.settingsPersonalProfile");
    const { theme, setTheme } = useTheme();
    const mounted = useIsClient();
    const locale = useLocale();
    const nextPathname = useNextPathname();
    const colorInputRef = React.useRef<HTMLInputElement>(null);
    const userId = useAuthStore((s) => s.user?.id);
    const snapshotRef = React.useRef<AppearanceEditSnapshot | null>(null);
    const [draftLanguage, setDraftLanguage] = React.useState(locale);

    const {
      accentKind,
      accent,
      customAccentHex,
      fontFamily,
      fontSize,
      sidebarLayout,
      formLabelPlacement,
      requiredIndicator,
      detailRowLineWidth,
      detailRowLineStyle,
      setAccentPreset,
      setAccentCustom,
      setFontFamily,
      setFontSize,
      setSidebarLayout,
      setFormLabelPlacement,
      setRequiredIndicator,
      setDetailRowLineWidth,
      setDetailRowLineStyle,
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
        detailRowLineWidth: s.detailRowLineWidth,
        detailRowLineStyle: s.detailRowLineStyle,
        setAccentPreset: s.setAccentPreset,
        setAccentCustom: s.setAccentCustom,
        setFontFamily: s.setFontFamily,
        setFontSize: s.setFontSize,
        setSidebarLayout: s.setSidebarLayout,
        setFormLabelPlacement: s.setFormLabelPlacement,
        setRequiredIndicator: s.setRequiredIndicator,
        setDetailRowLineWidth: s.setDetailRowLineWidth,
        setDetailRowLineStyle: s.setDetailRowLineStyle,
      })),
    );

    const [hexDraft, setHexDraft] = React.useState(customAccentHex);

    React.useEffect(() => {
      setHexDraft(customAccentHex);
    }, [customAccentHex]);

    React.useEffect(() => {
      if (!isEditing) setDraftLanguage(locale);
    }, [isEditing, locale]);

    const captureSnapshot = React.useCallback((): AppearanceEditSnapshot => {
      const store = useDashboardAppearanceStore.getState();
      return {
        store: captureAppearanceStoreSnapshot({
          accentKind: store.accentKind,
          accent: store.accent,
          customAccentHex: store.customAccentHex,
          fontFamily: store.fontFamily,
          fontSize: store.fontSize,
          sidebarLayout: store.sidebarLayout,
          formLabelPlacement: store.formLabelPlacement,
          requiredIndicator: store.requiredIndicator,
          detailRowLineWidth: store.detailRowLineWidth,
          detailRowLineStyle: store.detailRowLineStyle,
        }),
        themeMode: (theme === "dark" ? "dark" : "light") as "light" | "dark",
        language: locale,
        hexDraft: customAccentHex,
      };
    }, [theme, locale, customAccentHex]);

    React.useEffect(() => {
      if (isEditing) {
        snapshotRef.current = captureSnapshot();
        setDraftLanguage(locale);
      }
      // Capture once when entering edit mode.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing]);

    const restoreSnapshot = React.useCallback(() => {
      const snap = snapshotRef.current;
      if (!snap) return;
      useDashboardAppearanceStore.setState((state) => ({
        ...state,
        ...snap.store,
      }));
      setTheme(snap.themeMode);
      setHexDraft(snap.hexDraft);
      setDraftLanguage(snap.language);
    }, [setTheme]);

    const navigateToLocale = React.useCallback(
      (nextLocale: string) => {
        if (nextLocale === locale) return;
        const bare = stripLocaleSegmentsFromPathname(nextPathname);
        const path = bare === "/" ? "" : bare;
        const suffix =
          typeof window !== "undefined"
            ? `${window.location.search}${window.location.hash}`
            : "";
        window.location.assign(`/${nextLocale}${path}${suffix}`);
      },
      [locale, nextPathname],
    );

    const submit = React.useCallback(async () => {
      if (!userId || isSaving) return;
      setIsSaving(true);
      try {
        const store = useDashboardAppearanceStore.getState();
        const themeMode = (theme === "dark" ? "dark" : "light") as "light" | "dark";
        const preferences = buildApiAppearancePreferences({
          store: {
            accentKind: store.accentKind,
            accent: store.accent,
            customAccentHex: store.customAccentHex,
            fontFamily: store.fontFamily,
            fontSize: store.fontSize,
            sidebarLayout: store.sidebarLayout,
            formLabelPlacement: store.formLabelPlacement,
            requiredIndicator: store.requiredIndicator,
            detailRowLineWidth: store.detailRowLineWidth,
            detailRowLineStyle: store.detailRowLineStyle,
          },
          themeMode,
          language: draftLanguage,
          errorMessage: initialErrorMessage,
        });

        await updatePersonalProfile(String(userId), {
          appearance_settings: {
            preferences,
          },
        });

        toastSuccess(tProfile("appearanceSavedToast"));
        snapshotRef.current = null;
        onSaved?.();
        if (draftLanguage !== locale) {
          navigateToLocale(draftLanguage);
        }
      } catch (err) {
        toastApiError(err, tProfile("loadError"));
      } finally {
        setIsSaving(false);
      }
    }, [
      userId,
      isSaving,
      setIsSaving,
      theme,
      draftLanguage,
      initialErrorMessage,
      onSaved,
      locale,
      navigateToLocale,
      tProfile,
    ]);

    React.useImperativeHandle(
      ref,
      () => ({
        submit,
        cancel: () => {
          restoreSnapshot();
        },
      }),
      [submit, restoreSnapshot],
    );

    const languageOptions = React.useMemo(
      () => routing.locales.map((loc) => ({ value: loc, label: t(`languages.${loc}`) })),
      [t],
    );

    const fontOptions = React.useMemo(
      () => FONT_FAMILY_ORDER.map((id) => ({ value: id, label: t(`fonts.${id}`) })),
      [t],
    );

    const fontSizeOptions = React.useMemo(
      () =>
        FONT_SIZE_PX_OPTIONS.map((px) => ({
          value: String(px),
          label: t("fontSizeOption", { px }),
        })),
      [t],
    );

    function handleApplyCustom() {
      if (!isEditing) return;
      const n = normalizeHex(hexDraft);
      if (isValidHex(n)) setAccentCustom(n);
      else setHexDraft(customAccentHex);
    }

    const layoutIcons: Record<DashboardSidebarLayout, React.ReactNode> = {
      lithium: <LayoutPanelLeft className="size-6" strokeWidth={1.5} />,
      hydrogen: <LayoutPanelTop className="size-6" strokeWidth={1.5} />,
      boron: <PanelRight className="size-6" strokeWidth={1.5} />,
    };

    const canEdit = isEditing && !isSaving;

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
                    disabled={!canEdit}
                    onClick={() => setTheme(mode)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all",
                      active
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                      !canEdit && "pointer-events-none opacity-80",
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
              value={draftLanguage}
              onChange={setDraftLanguage}
              disabled={!canEdit}
              className="w-full max-w-md"
            />
          </SettingRow>

          <SettingRow label={t("accentPresetsLabel")} hint={t("customHint")}>
            <div className="max-w-lg space-y-3">
              <div
                className={cn(
                  "rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/40",
                  !canEdit && "opacity-80",
                )}
              >
                <div className="flex flex-wrap gap-1.5" role="listbox" aria-label={t("accentPresetsLabel")}>
                  {ACCENT_ORDER.map((id: DashboardAccentId) => {
                    const hex = ACCENT_HEX[id];
                    const selected = accentKind === "preset" && accent === id;
                    const checkColor = accentOnAccentHex(hex);
                    return (
                      <button
                        key={id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        disabled={!canEdit}
                        onClick={() => {
                          setAccentPreset(id);
                          setHexDraft(hex);
                        }}
                        className={cn(
                          "relative flex size-7 items-center justify-center rounded-md border transition",
                          selected
                            ? "border-slate-900 shadow-sm dark:border-white"
                            : "border-slate-200/80 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-400",
                          !canEdit && "pointer-events-none",
                        )}
                        style={{ background: hex }}
                        title={t(`accents.${id}`)}
                        aria-label={t(`accents.${id}`)}
                      >
                        {selected ? (
                          <Check className="size-3.5" strokeWidth={2.5} style={{ color: checkColor }} aria-hidden />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300">
                  {accentKind === "preset" ? (
                    <>
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {t(`accents.${accent}`)}
                      </span>
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {ACCENT_HEX[accent]}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {t("accentCustom")}
                      </span>
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {normalizeHex(customAccentHex)}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  disabled={!canEdit}
                  className="w-10 shrink-0 border-r border-slate-200 dark:border-slate-700 disabled:opacity-70"
                  style={{ background: normalizeHex(hexDraft) }}
                  onClick={() => colorInputRef.current?.click()}
                  aria-label={t("customColorPicker")}
                />
                <input
                  ref={colorInputRef}
                  type="color"
                  className="sr-only"
                  disabled={!canEdit}
                  value={normalizeHex(hexDraft).slice(0, 7)}
                  onChange={(e) => {
                    setHexDraft(e.target.value);
                    setAccentCustom(e.target.value);
                  }}
                />
                <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {t("customHexLabel")}
                  </span>
                  <input
                    type="text"
                    value={hexDraft}
                    disabled={!canEdit}
                    onChange={(e) => setHexDraft(e.target.value)}
                    onBlur={handleApplyCustom}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCustom()}
                    className="w-full bg-transparent font-mono text-sm text-slate-900 outline-none disabled:opacity-70 dark:text-white"
                    placeholder="#111111"
                    spellCheck={false}
                    aria-label={t("customHexLabel")}
                  />
                </div>
                {canEdit ? (
                  <AppButton
                    variant="secondary"
                    type="button"
                    onClick={handleApplyCustom}
                    className="m-1.5 shrink-0 px-3 py-1.5 text-xs font-semibold"
                  >
                    {t("applyCustom")}
                  </AppButton>
                ) : null}
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
              disabled={!canEdit}
              className="w-full max-w-md"
            />
          </SettingRow>

          <SettingRow label={t("fontSizeLabel")} hint={t("fontSizeHint")}>
            <CheckmarkSelect
              id="appearance-font-size"
              listLabel={t("fontSizeLabel")}
              options={fontSizeOptions}
              value={String(fontSize)}
              onChange={(v) => setFontSize(Number.parseInt(v, 10))}
              disabled={!canEdit}
              className="w-full max-w-md"
              searchable
            />
          </SettingRow>
        </SectionShell>

        <SectionShell title={t("layoutHeading")}>
          <SettingRow label={t("sidebarLayoutLabel")} hint={t("sidebarLayoutHint")}>
            <div className="grid gap-3 sm:grid-cols-3">
              {SIDEBAR_LAYOUT_ORDER.map((layout: DashboardSidebarLayout) => (
                <LayoutCard
                  key={layout}
                  active={sidebarLayout === layout}
                  disabled={!canEdit}
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
                  disabled={!canEdit}
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
                  disabled={!canEdit}
                  onClick={() => setRequiredIndicator(indicator)}
                >
                  {t(`requiredIndicators.${indicator}`)}
                </ChoiceChip>
              ))}
            </div>
          </SettingRow>

          <SettingRow label={t("detailRowLineWidthLabel")} hint={t("detailRowLineWidthHint")}>
            <div className="flex flex-wrap gap-2">
              {DETAIL_ROW_LINE_WIDTH_ORDER.map((width: DetailRowLineWidth) => (
                <ChoiceChip
                  key={width}
                  active={detailRowLineWidth === width}
                  disabled={!canEdit}
                  onClick={() => setDetailRowLineWidth(width)}
                  className="min-w-[4.5rem] flex-col gap-1.5 py-2.5"
                >
                  <span
                    className="block h-0 w-10 border-slate-800 dark:border-slate-200"
                    style={{
                      borderBottomWidth: width === "0" ? 0 : `${width}px`,
                      borderBottomStyle: detailRowLineStyle,
                      opacity: width === "0" ? 0.35 : 1,
                    }}
                    aria-hidden
                  />
                  <span className="text-[11px] font-semibold tabular-nums">
                    {width === "0" ? t("detailRowLineWidths.none") : `${width}px`}
                  </span>
                </ChoiceChip>
              ))}
            </div>
          </SettingRow>

          <SettingRow label={t("detailRowLineStyleLabel")} hint={t("detailRowLineStyleHint")}>
            <div className="flex flex-wrap gap-2">
              {DETAIL_ROW_LINE_STYLE_ORDER.map((style: DetailRowLineStyle) => (
                <ChoiceChip
                  key={style}
                  active={detailRowLineStyle === style}
                  disabled={!canEdit}
                  onClick={() => setDetailRowLineStyle(style)}
                  className="min-w-[5.5rem] flex-col gap-1.5 py-2.5"
                >
                  <span
                    className="block w-12 border-slate-800 dark:border-slate-200"
                    style={{
                      borderBottomWidth: Math.max(Number(detailRowLineWidth) || 1, 1),
                      borderBottomStyle: style,
                    }}
                    aria-hidden
                  />
                  <span className="text-[11px] font-semibold">{t(`detailRowLineStyles.${style}`)}</span>
                </ChoiceChip>
              ))}
            </div>
          </SettingRow>

          <FormLayoutPreview placement={formLabelPlacement} requiredIndicator={requiredIndicator} />
        </SectionShell>
      </div>
    );
  },
);

AppearancePanel.displayName = "AppearancePanel";
