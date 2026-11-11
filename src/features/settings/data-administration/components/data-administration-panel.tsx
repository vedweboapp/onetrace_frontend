"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  fetchExportHistoryPage,
  fetchImportHistoryPage,
} from "@/features/settings/data-administration/api/data-administration.api";
import { DataAdministrationHistoryList } from "@/features/settings/data-administration/components/data-administration-history-list";
import { useTabOrderStorageKey } from "@/shared/hooks/use-tab-order-storage-key";
import { CustomizableAppTabs, type AppTabItem } from "@/shared/ui";

type TabId = "import" | "export";

function isTabId(value: string | null): value is TabId {
  return value === "import" || value === "export";
}

export function DataAdministrationPanel() {
  const t = useTranslations("Dashboard.dataAdministration");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabsStorageKey = useTabOrderStorageKey("dataAdministration");
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = React.useState<TabId>(() =>
    isTabId(tabFromUrl) ? tabFromUrl : "import",
  );

  const tabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "import", label: t("tabs.import") },
      { id: "export", label: t("tabs.export") },
    ],
    [t],
  );

  React.useEffect(() => {
    if (!isTabId(tabFromUrl)) return;
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  function handleTabChange(tab: string) {
    if (!isTabId(tab)) return;
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "import") next.delete("tab");
    else next.set("tab", tab);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{t("description")}</p>
      </div>

      <CustomizableAppTabs
        tabs={tabs}
        value={activeTab}
        onValueChange={handleTabChange}
        storageKey={tabsStorageKey}
        ariaLabel={t("tabsAria")}
        panelIdPrefix="data-administration-tab"
      />

      <div
        role="tabpanel"
        id={`data-administration-tab-${activeTab}`}
        aria-labelledby={`data-administration-tab-trigger-${activeTab}`}
      >
        {activeTab === "import" ? (
          <DataAdministrationHistoryList kind="import" loadPage={fetchImportHistoryPage} />
        ) : (
          <DataAdministrationHistoryList kind="export" loadPage={fetchExportHistoryPage} />
        )}
      </div>
    </div>
  );
}
