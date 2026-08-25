"use client";

import type { CSSProperties, ReactNode } from "react";
import * as React from "react";
import { useSyncExternalStore } from "react";
import { useTheme } from "@teispace/next-themes";
import { useShallow } from "zustand/react/shallow";
import type { DashboardAccentId } from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import {
  setDashboardAppearanceUserKey,
  useDashboardAppearanceStore,
} from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
  ACCENT_HEX,
  accentOnAccentHex,
  normalizeAccentHex,
} from "@/features/dashboard/utils/accent-hex.util";
import {
  FONT_FAMILY_CSS,
  FONT_SIZE_CSS,
  GOOGLE_FONTS_STYLESHEET,
} from "@/features/dashboard/utils/appearance-typography.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  children: ReactNode;
  className?: string;
};

function isMonochromeBlackPreset(
  accentKind: "preset" | "custom",
  accentId: DashboardAccentId,
  customHex: string,
): boolean {
  if (accentKind === "preset" && accentId === "black") return true;
  if (accentKind === "custom" && normalizeAccentHex(customHex).toLowerCase() === "#111111") return true;
  return false;
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Applies dashboard appearance tokens (accent, typography, form layout, chrome layout)
 * via CSS variables + data attributes for the whole dashboard shell.
 * Also mirrors tokens onto `document.documentElement` so portaled menus/modals match.
 */
export function DashboardAppearanceScope({ children, className }: Props) {
  const { resolvedTheme } = useTheme();
  const mounted = useIsClient();
  const userId = useAuthStore((s) => s.user?.id);

  React.useEffect(() => {
    setDashboardAppearanceUserKey(userId);
  }, [userId]);

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
    })),
  );

  let hex =
    accentKind === "custom" ? normalizeAccentHex(customAccentHex) : ACCENT_HEX[accent];

  const dark = mounted && resolvedTheme === "dark";
  if (dark && isMonochromeBlackPreset(accentKind, accent, customAccentHex)) {
    hex = "#ffffff";
  }

  const onHex = accentOnAccentHex(hex);
  const typeScale = FONT_SIZE_CSS[fontSize];

  const style = {
    "--dash-accent": hex,
    "--dash-on-accent": onHex,
    "--dash-font-family": FONT_FAMILY_CSS[fontFamily],
    "--dash-font-size": typeScale.root,
    "--dash-label-size": typeScale.label,
    "--dash-body-size": typeScale.body,
    "--dash-type-scale": typeScale.scale,
    "--dash-detail-row-line-width": `${detailRowLineWidth}px`,
    "--dash-detail-row-line-style": detailRowLineStyle,
    fontFamily: "var(--dash-font-family)",
    fontSize: "var(--dash-font-size)",
  } as CSSProperties;

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "dash-appearance-google-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_STYLESHEET;
    document.head.appendChild(link);
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--dash-accent", hex);
    root.style.setProperty("--dash-on-accent", onHex);
    root.style.setProperty("--dash-font-family", FONT_FAMILY_CSS[fontFamily]);
    root.style.setProperty("--dash-font-size", typeScale.root);
    root.style.setProperty("--dash-label-size", typeScale.label);
    root.style.setProperty("--dash-body-size", typeScale.body);
    root.style.setProperty("--dash-type-scale", typeScale.scale);
    root.style.setProperty("--dash-detail-row-line-width", `${detailRowLineWidth}px`);
    root.style.setProperty("--dash-detail-row-line-style", detailRowLineStyle);
    root.setAttribute("data-font-size", fontSize);
    root.setAttribute("data-font-family", fontFamily);
    root.setAttribute("data-form-label", formLabelPlacement);
    root.setAttribute("data-required-indicator", requiredIndicator);
    root.setAttribute("data-detail-row-line-width", detailRowLineWidth);
    root.setAttribute("data-detail-row-line-style", detailRowLineStyle);
  }, [
    hex,
    onHex,
    fontFamily,
    fontSize,
    formLabelPlacement,
    requiredIndicator,
    detailRowLineWidth,
    detailRowLineStyle,
    typeScale.root,
    typeScale.label,
    typeScale.body,
    typeScale.scale,
  ]);

  return (
    <div
      className={cn("dash-appearance-scope", className)}
      style={style}
      data-sidebar-layout={sidebarLayout}
      data-form-label={formLabelPlacement}
      data-required-indicator={requiredIndicator}
      data-detail-row-line-width={detailRowLineWidth}
      data-detail-row-line-style={detailRowLineStyle}
      data-font-family={fontFamily}
      data-font-size={fontSize}
    >
      {children}
    </div>
  );
}
