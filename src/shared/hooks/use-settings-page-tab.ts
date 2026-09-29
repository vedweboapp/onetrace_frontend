"use client";

import * as React from "react";
import { useUrlParams } from "@/shared/hooks/use-url-params";

/**
 * Settings page tabs: optimistic local value + URL `?tab=` sync.
 * Local update is immediate so switching never waits on router.replace.
 * In-flight writes ignore stale intermediate URL values (rapid tab clicks).
 */
export function useSettingsPageTab(defaultTab: string) {
  const [params, setParam] = useUrlParams({ tab: defaultTab });
  const urlTab = String(params.tab || defaultTab);
  const [activeTab, setActiveTab] = React.useState(urlTab);
  const pendingTabRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (pendingTabRef.current !== null) {
      if (urlTab !== pendingTabRef.current) {
        // Stale or intermediate URL — keep the optimistic tab.
        return;
      }
      pendingTabRef.current = null;
    }
    setActiveTab(urlTab);
  }, [urlTab]);

  const setTab = React.useCallback(
    (next: string) => {
      const id = String(next || defaultTab);
      pendingTabRef.current = id;
      setActiveTab(id);
      setParam("tab", id);
    },
    [defaultTab, setParam],
  );

  return { activeTab, setTab } as const;
}
