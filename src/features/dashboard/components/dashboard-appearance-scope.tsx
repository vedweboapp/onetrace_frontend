"use client";

import type { CSSProperties, ReactNode } from "react";
import * as React from "react";
import { useSyncExternalStore } from "react";
import { useTheme } from "@teispace/next-themes";
import { useShallow } from "zustand/react/shallow";
import type { DashboardAccentId } from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import { useDashboardAppearanceStore } from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import {
  ACCENT_HEX,
  accentOnAccentHex,
  normalizeAccentHex,
} from "@/features/dashboard/utils/accent-hex.util";
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
    () => () => { },
    () => true,
    () => false,
  );
}

/**
 * Sets `--dash-accent` and `--dash-on-accent` for dashboard + settings UI
 * (auth/public use root defaults from globals.css).
 */
export function DashboardAppearanceScope({ children, className }: Props) {
  const { resolvedTheme } = useTheme();
  const mounted = useIsClient();

  const { accentKind, accent, customAccentHex } = useDashboardAppearanceStore(
    useShallow((s) => ({
      accentKind: s.accentKind,
      accent: s.accent,
      customAccentHex: s.customAccentHex,
    })),
  );

  let hex =
    accentKind === "custom" ? normalizeAccentHex(customAccentHex) : ACCENT_HEX[accent];

  const dark = mounted && resolvedTheme === "dark";
  if (dark && isMonochromeBlackPreset(accentKind, accent, customAccentHex)) {
    hex = "#ffffff";
  }

  const onHex = accentOnAccentHex(hex);

  const style = {
    "--dash-accent": hex,
    "--dash-on-accent": onHex,
  } as CSSProperties;

  return (
    <div className={cn(className)} style={style}>
      {children}
    </div>
  );
}
