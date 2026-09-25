import type { DashboardFontFamily } from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import {
  clampFontSizePx,
  DEFAULT_FONT_SIZE_PX,
  type DashboardFontSize,
} from "@/features/settings/personal-profile/store/dashboard-appearance.store";

/** CSS font-family stacks keyed by appearance preference. */
export const FONT_FAMILY_CSS: Record<DashboardFontFamily, string> = {
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  roboto: '"Roboto", ui-sans-serif, system-ui, sans-serif',
  sourceSans: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif',
  openSans: '"Open Sans", ui-sans-serif, system-ui, sans-serif',
  dmSans: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  system: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
};

export type DashTextScale = {
  root: string;
  label: string;
  body: string;
  scale: string;
  textXs: string;
  textSm: string;
  textBase: string;
  textLg: string;
  textXl: string;
  text2xl: string;
};

const BASE_PX = DEFAULT_FONT_SIZE_PX; // 16 — ratios match former Medium preset

function px(n: number): string {
  return `${Math.round(n)}px`;
}

/**
 * Build the full dash type scale from a chosen base body size (6–40px).
 * Tables, forms, detail labels, and Tailwind text tokens all follow these vars.
 */
export function buildDashTextScale(bodyPx: DashboardFontSize): DashTextScale {
  const body = clampFontSizePx(bodyPx);
  const scale = body / BASE_PX;
  return {
    root: px(body),
    label: px(Math.max(6, body * 0.94)),
    body: px(body),
    scale: String(Number(scale.toFixed(4))),
    textXs: px(Math.max(6, body * 0.875)),
    textSm: px(Math.max(6, body * 0.9375)),
    textBase: px(body),
    textLg: px(Math.min(48, body * 1.125)),
    textXl: px(Math.min(52, body * 1.25)),
    text2xl: px(Math.min(56, body * 1.5)),
  };
}

/** @deprecated Prefer `buildDashTextScale`. Kept for any residual preset lookups. */
export const FONT_SIZE_CSS: Record<"small" | "medium" | "large", DashTextScale> = {
  small: buildDashTextScale(14),
  medium: buildDashTextScale(16),
  large: buildDashTextScale(18),
};

/** Apply the full dash typography scale to a CSSStyleDeclaration target (e.g. html). */
export function applyDashTextScaleVars(
  target: { setProperty: (name: string, value: string) => void },
  fontSize: DashboardFontSize,
) {
  const scale = buildDashTextScale(fontSize);
  target.setProperty("--dash-font-size", scale.root);
  target.setProperty("--dash-label-size", scale.label);
  target.setProperty("--dash-body-size", scale.body);
  target.setProperty("--dash-type-scale", scale.scale);
  target.setProperty("--dash-text-xs", scale.textXs);
  target.setProperty("--dash-text-sm", scale.textSm);
  target.setProperty("--dash-text-base", scale.textBase);
  target.setProperty("--dash-text-lg", scale.textLg);
  target.setProperty("--dash-text-xl", scale.textXl);
  target.setProperty("--dash-text-2xl", scale.text2xl);
}

/** Google Fonts stylesheet URL for non-system families. */
export const GOOGLE_FONTS_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,400&family=Open+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Roboto:ital,wght@0,400;0,500;0,700;1,400&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap";
