"use client";

import React, { useState } from "react";
import { Eye, X } from "lucide-react";
import { currencyList } from "@/shared/form/components/currency-list";
import { updateOrganizationDetails } from "../api/company-settings.api";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { useTranslations } from "next-intl";
import { OrganizationDetails } from "../types/types";
import {
  buildDirtyOrganizationPatch,
  CURRENCY_TAB_FIELDS,
  hasDirtyFields,
} from "../utils/company-settings-diff.util";
import { AppButton, FieldGroup, surfaceInputClassName, surfaceSelectClassName } from "@/shared/ui";
import { useOrgCurrencyStore } from "@/shared/money/org-currency.store";
import { formatOrgMoney } from "@/shared/money/format-money.util";
import { normalizeOrgCurrencySettings } from "@/shared/money/org-currency.types";
import { ORG_NUMBER_FORMATS, normalizeOrgNumberFormat } from "@/shared/number/digit-grouping.util";
import { formatOrgNumber } from "@/shared/number/format-number.util";
import { useOrgNumberStore } from "@/shared/number/org-number.store";
import { NumericInput } from "@/shared/ui/numeric-input";
import { cn } from "@/core/utils/http.util";

interface CurrencySettings {
  currencyCode: string;
  currencyName: string;
  formatType: "symbol" | "code";
  symbol: string;
  symbolPosition: "before" | "after";
  digitSeparator: string;
  decimalPlaces: number;
  numberFormat: string;
}

interface CompanySettingsCurrencyProps {
  initialData: OrganizationDetails;
  onSaveSuccess?: (data: OrganizationDetails) => void;
}

const CompanySettingsCurrency = ({
  initialData,
  onSaveSuccess,
}: CompanySettingsCurrencyProps) => {
  const t = useTranslations("Dashboard.settingsCompany");
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState<CurrencySettings>({
    currencyCode: initialData.currencyCode || "INR",
    currencyName: initialData.currencyName || "Indian Rupee",
    formatType: (initialData.formatType as "symbol" | "code") || "symbol",
    symbol: initialData.symbol || "₹",
    symbolPosition: (initialData.symbolPosition as "before" | "after") || "before",
    digitSeparator: initialData.digitSeparator || "1,234,567.89",
    decimalPlaces:
      initialData.decimalPlaces !== undefined ? initialData.decimalPlaces : 2,
    numberFormat: normalizeOrgNumberFormat(initialData.numberFormat || initialData.digitSeparator),
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<CurrencySettings>({ ...settings });

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    useOrgCurrencyStore.getState().setSettings(settings);
    useOrgNumberStore.getState().setNumberFormat(settings.numberFormat);
  }, [settings]);

  const formatCurrencyValue = (
    value: number,
    formatType: "symbol" | "code",
    symbol: string,
    code: string,
    symbolPosition: "before" | "after",
    digitSeparator: string,
    decimalPlaces: number,
  ) =>
    formatOrgMoney(
      value,
      normalizeOrgCurrencySettings({
        currencyCode: code,
        formatType,
        symbol,
        symbolPosition,
        digitSeparator,
        decimalPlaces,
      }),
    );

  const handleOpenCustomize = () => {
    setTempSettings({ ...settings });
    setIsModalOpen(true);
  };

  const handleTempChange = (key: keyof CurrencySettings, value: any) => {
    setTempSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const selected = currencyList.find((c) => c.value === code);
    if (selected) {
      setTempSettings((prev) => ({
        ...prev,
        currencyCode: selected.value,
        currencyName: selected.label,
        symbol: selected.symbol,
      }));
    }
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const current: OrganizationDetails = {
        ...initialData,
        ...tempSettings,
      };
      const patch = buildDirtyOrganizationPatch(
        initialData,
        current,
        CURRENCY_TAB_FIELDS,
      );

      if (!hasDirtyFields(patch)) {
        toastSuccess(t("noChangesToast"));
        setIsModalOpen(false);
        return;
      }

      const updated = await updateOrganizationDetails(1, patch);
      setSettings({ ...tempSettings });
      setIsModalOpen(false);
      toastSuccess(t("currencyUpdatedToast"));
      onSaveSuccess?.(updated);
    } catch (error) {
      console.error("Failed to save organization currency:", error);
      toastApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const formattedCurrentValue = formatCurrencyValue(
    1234567.89,
    settings.formatType,
    settings.symbol,
    settings.currencyCode,
    settings.symbolPosition,
    settings.digitSeparator,
    settings.decimalPlaces,
  );

  const formattedPreviewValue = formatCurrencyValue(
    1234567.89,
    tempSettings.formatType,
    tempSettings.symbol,
    tempSettings.currencyCode,
    tempSettings.symbolPosition,
    tempSettings.digitSeparator,
    tempSettings.decimalPlaces,
  );

  return (
    <div
      className={cn(
        "mt-2 flex w-full flex-col gap-8 rounded-xl border border-slate-200/90 bg-white p-6 dark:border-slate-700 dark:bg-slate-950 sm:p-8",
        "transition-opacity duration-500",
        isMounted ? "animate-in fade-in opacity-100" : "opacity-0",
      )}
    >
      <div className="grid w-full gap-8 sm:grid-cols-2">
      <div className="w-full space-y-3">
        <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Home Currency
        </h3>
        <div className="flex items-center gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex size-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-xl font-bold text-slate-700 dark:text-slate-200">
              {settings.symbol}
            </span>
          </div>
          <div>
            <h4 className="text-[length:var(--dash-body-size,0.875rem)] font-semibold text-slate-800 dark:text-slate-100">
              {settings.currencyName} — {settings.currencyCode}
            </h4>
            <p className="text-[length:var(--dash-label-size,0.875rem)] text-slate-500">
              Your primary currency
            </p>
          </div>
        </div>
      </div>

      <div className="w-full space-y-3">
        <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Format
        </h3>
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div>
            <h4 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              {formattedCurrentValue}
            </h4>
            <p className="text-[length:var(--dash-label-size,0.875rem)] text-slate-500">
              Current format
            </p>
          </div>
          <AppButton variant="primary" onClick={handleOpenCustomize}>
            Customize
          </AppButton>
        </div>
      </div>
      </div>

      <div className="w-full space-y-3">
        <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Number format
        </h3>
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              {formatOrgNumber(1234567.89, 2, settings.numberFormat)}
            </h4>
            <p className="text-[length:var(--dash-label-size,0.875rem)] text-slate-500">
              Used for quantity and other number-only fields
            </p>
          </div>
          <select
            aria-label="Number format"
            value={settings.numberFormat}
            onChange={(e) => {
              const next = normalizeOrgNumberFormat(e.target.value);
              setSettings((prev) => ({ ...prev, numberFormat: next }));
              void (async () => {
                try {
                  const current: OrganizationDetails = {
                    ...initialData,
                    ...settings,
                    numberFormat: next,
                  };
                  const patch = buildDirtyOrganizationPatch(initialData, current, ["numberFormat"]);
                  if (!hasDirtyFields(patch)) return;
                  const updated = await updateOrganizationDetails(1, patch);
                  toastSuccess(t("currencyUpdatedToast"));
                  onSaveSuccess?.(updated);
                } catch (error) {
                  toastApiError(error);
                }
              })();
            }}
            className={cn(surfaceSelectClassName, "field-control max-w-xs")}
          >
            {ORG_NUMBER_FORMATS.map((fmt) => (
              <option key={fmt} value={fmt}>
                {fmt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                Change Home Currency
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="size-4.5 shrink-0" strokeWidth={2.5} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <FieldGroup label="Home Currency" htmlFor="currency-code" required>
                <select
                  id="currency-code"
                  value={tempSettings.currencyCode}
                  onChange={handleCurrencyChange}
                  className={cn(surfaceSelectClassName, "field-control")}
                >
                  {currencyList.map((currency) => (
                    <option
                      key={`${currency.countryCode}-${currency.value}`}
                      value={currency.value}
                    >
                      {currency.label} — {currency.value}
                    </option>
                  ))}
                </select>
              </FieldGroup>

              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Format" htmlFor="currency-format">
                  <div
                    id="currency-format"
                    className="flex w-full rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {(["symbol", "code"] as const).map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => handleTempChange("formatType", kind)}
                        className={cn(
                          "flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition",
                          tempSettings.formatType === kind
                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                            : "text-slate-500 hover:text-slate-700",
                        )}
                      >
                        {kind}
                      </button>
                    ))}
                  </div>
                </FieldGroup>

                <FieldGroup label="Symbol" htmlFor="currency-symbol">
                  <input
                    id="currency-symbol"
                    type="text"
                    value={
                      tempSettings.formatType === "symbol"
                        ? tempSettings.symbol
                        : tempSettings.currencyCode
                    }
                    readOnly
                    className={cn(
                      surfaceInputClassName,
                      "field-control cursor-not-allowed bg-slate-50 dark:bg-slate-800/50",
                    )}
                  />
                </FieldGroup>
              </div>

              <FieldGroup label="Symbol Position" htmlFor="currency-position" required>
                <select
                  id="currency-position"
                  value={tempSettings.symbolPosition}
                  onChange={(e) => handleTempChange("symbolPosition", e.target.value)}
                  className={cn(surfaceSelectClassName, "field-control")}
                >
                  <option value="before">Before Value</option>
                  <option value="after">After Value</option>
                </select>
              </FieldGroup>

              <FieldGroup label="Decimal Places" htmlFor="currency-decimals" required>
                <NumericInput
                  id="currency-decimals"
                  integer
                  value={tempSettings.decimalPlaces}
                  onChange={(next) => {
                    const n = Number.parseInt(next, 10);
                    handleTempChange("decimalPlaces", Number.isFinite(n) ? Math.max(0, Math.min(6, n)) : 0);
                  }}
                />
              </FieldGroup>

              <FieldGroup label="Number format" htmlFor="org-number-format">
                <select
                  id="org-number-format"
                  value={tempSettings.numberFormat}
                  onChange={(e) => handleTempChange("numberFormat", normalizeOrgNumberFormat(e.target.value))}
                  className={cn(surfaceSelectClassName, "field-control")}
                >
                  {ORG_NUMBER_FORMATS.map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt}
                    </option>
                  ))}
                </select>
              </FieldGroup>

              <div className="mt-2 flex items-center gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600">
                  <Eye className="size-5 text-slate-400" />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Preview
                  </span>
                  <span className="mt-0.5 block text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                    {formattedPreviewValue}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/80">
              <AppButton variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </AppButton>
              <AppButton
                variant="primary"
                type="button"
                onClick={handleConfirm}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Confirm"}
              </AppButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CompanySettingsCurrency;
