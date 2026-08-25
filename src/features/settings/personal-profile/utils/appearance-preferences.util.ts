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

const API_FONT_SIZE_TO_STORE: Record<string, DashboardFontSize> = {
  small: "small",
  default: "medium",
  large: "large",
  xlarge: "large",
};

const STORE_FONT_SIZE_TO_API: Record<DashboardFontSize, string> = {
  small: "small",
  medium: "default",
  large: "large",
};

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
    out.fontSize = API_FONT_SIZE_TO_STORE[prefs.font.size] ?? "medium";
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
      size: STORE_FONT_SIZE_TO_API[store.fontSize],
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
      color_mode: "default",
      custom_hex: "#DC2626",
    },
    dashboard_layout: store.sidebarLayout,
    page_label_position: store.formLabelPlacement,
    mandatory_field_display:
      store.requiredIndicator === "redLine" ? "red_line" : "asterisk",
  };
}

export function captureAppearanceStoreSnapshot(
  store: AppearanceStoreSlice,
): AppearanceStoreSlice {
  return { ...store };
}
