import type { LucideIcon } from "lucide-react";
import { ListTodo, Shapes, Tag, Tags } from "lucide-react";
import { routes } from "@/shared/config/routes";

export type CustomizationSettingsItemId = "projectTypes" | "pinStatus" | "jobStatus" | "tags";

export type CustomizationSettingsItem = {
  id: CustomizationSettingsItemId;
  href: string;
  icon: LucideIcon;
};

export const CUSTOMIZATION_SETTINGS_ITEMS: CustomizationSettingsItem[] = [
  { id: "projectTypes", href: routes.dashboard.settingsProjectTypes, icon: Shapes },
  { id: "pinStatus", href: routes.dashboard.settingsPinStatus, icon: Tags },
  { id: "jobStatus", href: routes.dashboard.settingsJobStatus, icon: ListTodo },
  { id: "tags", href: routes.dashboard.settingsTags, icon: Tag },
];

export function isCustomizationSettingsPath(pathname: string): boolean {
  if (pathname === routes.dashboard.settingsCustomization) return true;
  if (pathname.startsWith(`${routes.dashboard.settingsCustomization}/`)) return true;
  return CUSTOMIZATION_SETTINGS_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
