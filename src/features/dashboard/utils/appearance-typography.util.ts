import type {
  DashboardFontFamily,
  DashboardFontSize,
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

/**
 * Appearance type scale. `root` is the dashboard base size (px).
 * Small/Medium/Large rescale Tailwind `text-*`, form controls, tables, and detail pages.
 * Micro copy (xs) is bumped so Small ≈ 12px and Medium ≈ 14px minimum.
 */
export const FONT_SIZE_CSS: Record<DashboardFontSize, DashTextScale> = {
  small: {
    root: "14px",
    label: "13px",
    body: "14px",
    scale: "0.875",
    textXs: "12px",
    textSm: "13px",
    textBase: "14px",
    textLg: "16px",
    textXl: "18px",
    text2xl: "21px",
  },
  medium: {
    root: "16px",
    label: "15px",
    body: "16px",
    scale: "1",
    textXs: "14px",
    textSm: "15px",
    textBase: "16px",
    textLg: "18px",
    textXl: "20px",
    text2xl: "24px",
  },
  large: {
    root: "18px",
    label: "17px",
    body: "18px",
    scale: "1.125",
    textXs: "16px",
    textSm: "17px",
    textBase: "18px",
    textLg: "20px",
    textXl: "23px",
    text2xl: "27px",
  },
};

/** Apply the full dash typography scale to a CSSStyleDeclaration target (e.g. html). */
export function applyDashTextScaleVars(
  target: { setProperty: (name: string, value: string) => void },
  fontSize: DashboardFontSize,
) {
  const scale = FONT_SIZE_CSS[fontSize];
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
