import { routes } from "@/shared/config/routes";

export type CustomizationSettingsItemId =
  | "projectTypes"
  | "installationTypes"
  | "vendorTypes"
  | "unitTypes"
  | "rejectionReasons"
  | "checklistTypes"
  | "projectStatus"
  | "pinStatus"
  | "jobStatus"
  | "materialStatus"
  | "title"
  | "tags";

export const CUSTOMIZATION_SETTINGS_HREFS: ReadonlyArray<{
  id: CustomizationSettingsItemId;
  href: string;
}> = [
    { id: "projectTypes", href: routes.dashboard.settingsProjectTypes },
    { id: "installationTypes", href: routes.dashboard.settingsInstallationTypes },
    { id: "vendorTypes", href: routes.dashboard.settingsVendorTypes },
    { id: "unitTypes", href: routes.dashboard.settingsUnitTypes },
    { id: "rejectionReasons", href: routes.dashboard.settingsRejectionReasons },
    { id: "checklistTypes", href: routes.dashboard.settingsChecklistTypes },
    { id: "projectStatus", href: routes.dashboard.settingsProjectStatus },
    { id: "pinStatus", href: routes.dashboard.settingsPinStatus },
    { id: "jobStatus", href: routes.dashboard.settingsJobStatus },
    { id: "materialStatus", href: routes.dashboard.settingsMaterialStatus },
    { id: "tags", href: routes.dashboard.settingsTags },
    { id: "title", href:routes.dashboard.settingsTitle }
  ];

export function isCustomizationSettingsPath(pathname: string): boolean {
  if (pathname === routes.dashboard.settingsCustomization) return true;
  if (pathname.startsWith(`${routes.dashboard.settingsCustomization}/`)) return true;
  return CUSTOMIZATION_SETTINGS_HREFS.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
