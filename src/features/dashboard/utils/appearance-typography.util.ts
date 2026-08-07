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

/**
 * Appearance type scale. `root` is the dashboard base size (px).
 * Label/body are derived in CSS from `--dash-font-size` so Small/Medium/Large
 * actually rescale Tailwind `text-*` utilities and form controls.
 */
export const FONT_SIZE_CSS: Record<
  DashboardFontSize,
  { root: string; label: string; body: string; scale: string }
> = {
  small: {
    root: "13px",
    label: "calc(var(--dash-font-size) * 0.92)",
    body: "calc(var(--dash-font-size) * 1)",
    scale: "0.867",
  },
  medium: {
    root: "15px",
    label: "calc(var(--dash-font-size) * 0.933)",
    body: "calc(var(--dash-font-size) * 1)",
    scale: "1",
  },
  large: {
    root: "17px",
    label: "calc(var(--dash-font-size) * 0.94)",
    body: "calc(var(--dash-font-size) * 1)",
    scale: "1.133",
  },
};

/** Google Fonts stylesheet URL for non-system families. */
export const GOOGLE_FONTS_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,400&family=Open+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Roboto:ital,wght@0,400;0,500;0,700;1,400&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap";
