"use client";

import type { CSSProperties, ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { useDashboardAppearanceStore } from "@/features/dashboard/store/dashboard-appearance-store";
import { ACCENT_HEX, normalizeAccentHex } from "@/features/dashboard/lib/accent-hex";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Sets `--dash-accent` for dashboard + settings UI (skip auth/public — only mounted under `(dashboard)`).
 */
export function DashboardAppearanceScope({ children, className }: Props) {
  const { accentKind, accent, customAccentHex } = useDashboardAppearanceStore(
    useShallow((s) => ({
      accentKind: s.accentKind,
      accent: s.accent,
      customAccentHex: s.customAccentHex,
    })),
  );

  const hex =
    accentKind === "custom"
      ? normalizeAccentHex(customAccentHex)
      : ACCENT_HEX[accent];

  const style = {
    "--dash-accent": hex,
  } as CSSProperties;

  return (
    <div className={cn(className)} style={style}>
      {children}
    </div>
  );
}
