import type { LucideIcon } from "lucide-react";
import { Ban, ClipboardList, ListChecks, ListTodo, MapPin, Plug, Ruler, Shapes, Store, Tag, Tags, Text } from "lucide-react";
import {
  CUSTOMIZATION_SETTINGS_HREFS,
  type CustomizationSettingsItemId,
} from "@/shared/config/customization-settings-nav";

export type CustomizationSettingsItem = {
  id: CustomizationSettingsItemId;
  href: string;
  icon: LucideIcon;
};

const ICON_BY_ID: Record<CustomizationSettingsItemId, LucideIcon> = {
  projectTypes: Shapes,
  installationTypes: Plug,
  vendorTypes: Store,
  unitTypes: Ruler,
  rejectionReasons: Ban,
  checklistTypes: ListChecks,
  projectStatus: Tags,
  pinStatus: MapPin,
  jobStatus: ListTodo,
  materialStatus: ClipboardList,
  tags: Tag,
  title: Text
};

export const CUSTOMIZATION_SETTINGS_ITEMS: CustomizationSettingsItem[] = CUSTOMIZATION_SETTINGS_HREFS.map(
  (item) => ({
    ...item,
    icon: ICON_BY_ID[item.id],
  }),
);
