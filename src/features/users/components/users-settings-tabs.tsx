"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { AppTabs, type AppTabItem } from "@/shared/ui";
import { routes } from "@/shared/config/routes";

export function UsersSettingsTabs() {
  const t = useTranslations("Dashboard.users");
  const pathname = usePathname();
  const router = useRouter();

  const groupsHref = routes.dashboard.settingsUserGroups;
  const usersHref = routes.dashboard.settingsUsers;
  const onGroups = pathname === groupsHref || pathname.startsWith(`${groupsHref}/`);

  const tabs: AppTabItem[] = [
    { id: "users", label: t("tabs.users") },
    { id: "groups", label: t("tabs.groups") },
  ];

  return (
    <AppTabs
      tabs={tabs}
      value={onGroups ? "groups" : "users"}
      ariaLabel={t("tabs.aria")}
      panelIdPrefix="users-settings-tab"
      className="mb-1"
      onValueChange={(id) => {
        router.push(id === "groups" ? groupsHref : usersHref);
      }}
    />
  );
}
