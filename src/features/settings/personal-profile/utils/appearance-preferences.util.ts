import type {
  DashboardAccentId,
  DashboardAccentKind,
  DashboardFontFamily,
  DashboardFontSize,
  DashboardSidebarLayout,
  DetailRowLineStyle,
  DetailRowLineWidth,
  FormLabelPlacement,
  RequiredFieldIndicator,
} from "../store/dashboard-appearance.store";
import {
  clampFontSizePx,
  DEFAULT_FONT_SIZE_PX,
  DETAIL_ROW_LINE_STYLE_ORDER,
  DETAIL_ROW_LINE_WIDTH_ORDER,
} from "../store/dashboard-appearance.store";

/** API `appearance_settings.preferences` shape from user-profile. */
export type ApiAppearancePreferences = {
  font?: {
    size?: string;
    family?: string;
  };
  accent?: {
    type?: "preset" | "custom";
    preset_id?: string;
    custom_hex?: string;
  };
  language?: string;
  theme_mode?: "light" | "dark";
  error_message?: {
    color_mode?: "default" | "custom";
    custom_hex?: string;
  };
  dashboard_layout?: string;
  page_label_position?: string;
  mandatory_field_display?: string;
  /** Detail-page field row divider (Appearance → Form layout). */
  detail_row_line?: {
    width?: string;
    style?: string;
  };
};

/**
 * Full default preferences for new users (backend login / profile create).
 * Keep in sync with `useDashboardAppearanceStore` initial state + Appearance panel.
 */
export const DEFAULT_API_APPEARANCE_PREFERENCES: Required<
  Pick<
    ApiAppearancePreferences,
    | "theme_mode"
    | "language"
    | "dashboard_layout"
    | "page_label_position"
    | "mandatory_field_display"
    | "font"
    | "accent"
    | "error_message"
    | "detail_row_line"
  >
> = {
  theme_mode: "light",
  language: "en",
  dashboard_layout: "lithium",
  page_label_position: "left",
  mandatory_field_display: "asterisk",
  font: {
    family: "inter",
    size: "16px",
  },
  accent: {
    type: "preset",
    preset_id: "black",
    custom_hex: "#111111",
  },
  error_message: {
    color_mode: "default",
    custom_hex: "#DC2626",
  },
  detail_row_line: {
    width: "1",
    style: "solid",
  },
};

export type AppearanceStoreSlice = {
  accentKind: DashboardAccentKind;
  accent: DashboardAccentId;
  customAccentHex: string;
  fontFamily: DashboardFontFamily;
  fontSize: DashboardFontSize;
  sidebarLayout: DashboardSidebarLayout;
  formLabelPlacement: FormLabelPlacement;
  requiredIndicator: RequiredFieldIndicator;
  detailRowLineWidth: DetailRowLineWidth;
  detailRowLineStyle: DetailRowLineStyle;
};

function fontSizeFromApi(raw: string | undefined): DashboardFontSize {
  return clampFontSizePx(raw, DEFAULT_FONT_SIZE_PX);
}

function fontSizeToApi(size: DashboardFontSize): string {
  return `${clampFontSizePx(size)}px`;
}

const API_FONT_FAMILY_TO_STORE: Record<string, DashboardFontFamily> = {
  inter: "inter",
  roboto: "roboto",
  "open-sans": "openSans",
  poppins: "dmSans",
};

const STORE_FONT_FAMILY_TO_API: Record<DashboardFontFamily, string> = {
  inter: "inter",
  roboto: "roboto",
  sourceSans: "inter",
  openSans: "open-sans",
  dmSans: "poppins",
  system: "inter",
};

const API_LAYOUT_TO_STORE: Record<string, DashboardSidebarLayout> = {
  lithium: "lithium",
  hydrogen: "hydrogen",
  boron: "boron",
};

const API_LABEL_TO_STORE: Record<string, FormLabelPlacement> = {
  top: "top",
  left: "left",
  right: "right",
};

const API_REQUIRED_TO_STORE: Record<string, RequiredFieldIndicator> = {
  asterisk: "asterisk",
  red_line: "redLine",
  redLine: "redLine",
};

function pickAccentId(raw: string | undefined): DashboardAccentId {
  const allowed = new Set([
    "black",
    "slate",
    "indigo",
    "emerald",
    "rose",
    "violet",
    "amber",
    "sky",
    "fuchsia",
    "teal",
    "orange",
  ]);
  return allowed.has(raw ?? "") ? (raw as DashboardAccentId) : "black";
}

function pickDetailRowWidth(raw: string | undefined): DetailRowLineWidth {
  return DETAIL_ROW_LINE_WIDTH_ORDER.includes(raw as DetailRowLineWidth)
    ? (raw as DetailRowLineWidth)
    : "1";
}

function pickDetailRowStyle(raw: string | undefined): DetailRowLineStyle {
  return DETAIL_ROW_LINE_STYLE_ORDER.includes(raw as DetailRowLineStyle)
    ? (raw as DetailRowLineStyle)
    : "solid";
}

/** Map API preferences into dashboard appearance store fields. */
export function appearanceStoreFromApiPreferences(
  prefs: ApiAppearancePreferences | null | undefined,
): Partial<AppearanceStoreSlice> {
  if (!prefs) return {};

  const out: Partial<AppearanceStoreSlice> = {};

  if (prefs.font?.family) {
    out.fontFamily = API_FONT_FAMILY_TO_STORE[prefs.font.family] ?? "inter";
  }
  if (prefs.font?.size) {
    out.fontSize = fontSizeFromApi(prefs.font.size);
  }

  if (prefs.accent?.type === "custom" && prefs.accent.custom_hex) {
    out.accentKind = "custom";
    out.customAccentHex = prefs.accent.custom_hex;
  } else if (prefs.accent?.preset_id) {
    out.accentKind = "preset";
    out.accent = pickAccentId(prefs.accent.preset_id);
    out.customAccentHex = prefs.accent.custom_hex ?? "#111111";
  }

  if (prefs.dashboard_layout) {
    out.sidebarLayout = API_LAYOUT_TO_STORE[prefs.dashboard_layout] ?? "lithium";
  }
  if (prefs.page_label_position) {
    out.formLabelPlacement = API_LABEL_TO_STORE[prefs.page_label_position] ?? "left";
  }
  if (prefs.mandatory_field_display) {
    out.requiredIndicator =
      API_REQUIRED_TO_STORE[prefs.mandatory_field_display] ?? "asterisk";
  }

  if (prefs.detail_row_line?.width != null) {
    out.detailRowLineWidth = pickDetailRowWidth(prefs.detail_row_line.width);
  }
  if (prefs.detail_row_line?.style != null) {
    out.detailRowLineStyle = pickDetailRowStyle(prefs.detail_row_line.style);
  }

  return out;
}

/** Build API preferences payload from store + theme/locale. */
export function buildApiAppearancePreferences(input: {
  store: AppearanceStoreSlice;
  themeMode: "light" | "dark";
  language: string;
  errorMessage?: ApiAppearancePreferences["error_message"];
}): ApiAppearancePreferences {
  const { store, themeMode, language, errorMessage } = input;

  return {
    font: {
      size: fontSizeToApi(store.fontSize),
      family: STORE_FONT_FAMILY_TO_API[store.fontFamily],
    },
    accent: {
      type: store.accentKind,
      preset_id: store.accent,
      custom_hex: store.customAccentHex,
    },
    language,
    theme_mode: themeMode,
    error_message: errorMessage ?? {
      ...DEFAULT_API_APPEARANCE_PREFERENCES.error_message,
    },
    dashboard_layout: store.sidebarLayout,
    page_label_position: store.formLabelPlacement,
    mandatory_field_display:
      store.requiredIndicator === "redLine" ? "red_line" : "asterisk",
    detail_row_line: {
      width: store.detailRowLineWidth,
      style: store.detailRowLineStyle,
    },
  };
}

export function captureAppearanceStoreSnapshot(
  store: AppearanceStoreSlice,
): AppearanceStoreSlice {
  return { ...store };
}
