"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTabOrderStorageKey } from "@/shared/hooks/use-tab-order-storage-key";
import { CustomizableAppTabs, type AppTabItem } from "@/shared/ui";
import { routes } from "@/shared/config/routes";

export function UsersSettingsTabs() {
  const t = useTranslations("Dashboard.users");
  const pathname = usePathname();
  const router = useRouter();
  const tabsStorageKey = useTabOrderStorageKey("usersSettings");

  const groupsHref = routes.dashboard.settingsUserGroups;
  const usersHref = routes.dashboard.settingsUsers;
  const onGroups = pathname === groupsHref || pathname.startsWith(`${groupsHref}/`);

  const tabs: AppTabItem[] = [
    { id: "users", label: t("tabs.users") },
    { id: "groups", label: t("tabs.groups") },
  ];

  return (
    <CustomizableAppTabs
      tabs={tabs}
      value={onGroups ? "groups" : "users"}
      storageKey={tabsStorageKey}
      ariaLabel={t("tabs.aria")}
      panelIdPrefix="users-settings-tab"
      className="mb-1"
      onValueChange={(id) => {
        router.push(id === "groups" ? groupsHref : usersHref);
      }}
    />
  );
}
