"use client";

import * as React from "react";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { getSessionOrganizationId } from "@/features/auth/utils/get-session-organization-id";
import { getOrganizationDetails } from "@/features/settings/company-settings/api/company-settings.api";
import { getOrgCurrencySettings, useOrgCurrencyStore } from "@/shared/money/org-currency.store";
import { formatOrgMoney, formatOrgMoneyValue } from "@/shared/money/format-money.util";
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
    } catch {
      useOrgCurrencyStore.getState().setSettings(getOrgCurrencySettings());
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
  const affix = orgCurrencyAffix(settings);

  return { settings, loaded, formatMoney, formatMoneyValue, affix };
}
