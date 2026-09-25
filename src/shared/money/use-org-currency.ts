"use client";

import * as React from "react";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { getSessionOrganizationId } from "@/features/auth/utils/get-session-organization-id";
import { getOrganizationDetails } from "@/features/settings/company-settings/api/company-settings.api";
import { getOrgCurrencySettings, useOrgCurrencyStore } from "@/shared/money/org-currency.store";
import { useOrgNumberStore } from "@/shared/number/org-number.store";
import { formatOrgMoney, formatOrgMoneyNumber, formatOrgMoneyValue } from "@/shared/money/format-money.util";
import { orgCurrencyAffix } from "@/shared/money/org-currency.types";

let loadPromise: Promise<void> | null = null;

export async function ensureOrgCurrencyLoaded(): Promise<void> {
  const state = useOrgCurrencyStore.getState();
  if (state.loaded || state.loading) {
    if (loadPromise) await loadPromise;
    return;
  }

  const orgs = useAuthStore.getState().organizations;
  const orgId = getSessionOrganizationId(orgs) ?? 1;

  state.setLoading(true);
  loadPromise = (async () => {
    try {
      const details = await getOrganizationDetails(orgId);
      useOrgCurrencyStore.getState().setSettings({
        currencyCode: details.currencyCode,
        currencyName: details.currencyName,
        formatType: details.formatType as "symbol" | "code" | undefined,
        symbol: details.symbol,
        symbolPosition: details.symbolPosition as "before" | "after" | undefined,
        digitSeparator: details.digitSeparator,
        decimalPlaces: details.decimalPlaces,
      });
      useOrgNumberStore.getState().setNumberFormat(details.numberFormat || details.digitSeparator);
    } catch {
      useOrgCurrencyStore.getState().setSettings(getOrgCurrencySettings());
      useOrgNumberStore.getState().setNumberFormat(getOrgCurrencySettings().digitSeparator);
      useOrgCurrencyStore.getState().setLoaded(true);
    } finally {
      useOrgCurrencyStore.getState().setLoading(false);
      loadPromise = null;
    }
  })();

  await loadPromise;
}

/** Hydrates org currency once for the dashboard session. */
export function OrgCurrencyBootstrap() {
  const accessToken = useAuthStore((s) => s.accessToken);

  React.useEffect(() => {
    if (!accessToken) return;
    void ensureOrgCurrencyLoaded();
  }, [accessToken]);

  React.useEffect(() => {
    function onWheel(e: WheelEvent) {
      const el = e.target;
      if (!(el instanceof HTMLInputElement)) return;
      if (el.type !== "number") return;
      el.blur();
    }
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target;
      if (!(el instanceof HTMLInputElement)) return;
      if (el.type !== "number") return;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
    }
    document.addEventListener("wheel", onWheel, { passive: true });
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}

export function useOrgCurrency() {
  const settings = useOrgCurrencyStore((s) => s.settings);
  const loaded = useOrgCurrencyStore((s) => s.loaded);

  React.useEffect(() => {
    void ensureOrgCurrencyLoaded();
  }, []);

  const formatMoney = React.useCallback((amount: number) => formatOrgMoney(amount, settings), [settings]);
  const formatMoneyValue = React.useCallback(
    (value: unknown) => formatOrgMoneyValue(value, settings),
    [settings],
  );
  const formatMoneyNumber = React.useCallback(
    (amount: number) => formatOrgMoneyNumber(amount, settings),
    [settings],
  );
  const affix = orgCurrencyAffix(settings);

  return { settings, loaded, formatMoney, formatMoneyValue, formatMoneyNumber, affix };
}
