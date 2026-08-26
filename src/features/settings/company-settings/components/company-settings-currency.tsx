"use client";

import React, { useState } from "react";
import { Banknote, Eye } from "lucide-react";
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
import {
  AppButton,
  AppModal,
  CheckmarkSelect,
  FieldGroup,
  surfaceInputClassName,
} from "@/shared/ui";
import { useOrgCurrencyStore } from "@/shared/money/org-currency.store";
import { formatOrgMoney } from "@/shared/money/format-money.util";
import { normalizeOrgCurrencySettings } from "@/shared/money/org-currency.types";
import { ORG_NUMBER_FORMATS, normalizeOrgNumberFormat } from "@/shared/number/digit-grouping.util";
import { formatOrgNumber } from "@/shared/number/format-number.util";
import { useOrgNumberStore } from "@/shared/number/org-number.store";
import { NumericInput } from "@/shared/ui/numeric-input";
import FormSectionCard from "@/shared/ui/form-section-card";
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

function SummaryCard({
  title,
  value,
  hint,
  leading,
}: {
  title: string;
  value: React.ReactNode;
  hint: string;
  leading?: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col gap-3 rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {leading}
        <div className="min-w-0">
          <div className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-lg">
            {value}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        </div>
      </div>
    </div>
  );
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
    digitSeparator: normalizeOrgNumberFormat(initialData.digitSeparator),
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

  const handleTempChange = (key: keyof CurrencySettings, value: unknown) => {
    setTempSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCurrencyChange = (code: string) => {
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

  const currencyOptions = React.useMemo(
    () =>
      currencyList.map((currency) => ({
        value: currency.value,
        label: `${currency.label} — ${currency.value}`,
      })),
    [],
  );

  const numberFormatOptions = React.useMemo(
    () => ORG_NUMBER_FORMATS.map((fmt) => ({ value: fmt, label: fmt })),
    [],
  );

  return (
    <div
      className={cn(
        "settings-aligned-fields w-full min-w-0 rounded-xl border border-slate-200/90 bg-white",
        "px-4 py-5 sm:px-6 sm:py-6 dark:border-slate-800 dark:bg-slate-950",
        "transition-opacity duration-500",
        isMounted ? "animate-in fade-in opacity-100" : "opacity-0",
      )}
    >
      <FormSectionCard
        title={t("currencySectionTitle")}
        icon={<Banknote size={18} strokeWidth={1.75} />}
        action={
          <AppButton variant="primary" size="sm" type="button" onClick={handleOpenCustomize}>
            {t("customize")}
          </AppButton>
        }
      >
        <p className="-mt-3 mb-1 text-sm text-slate-500 dark:text-slate-400">
          {t("currencySectionSubtitle")}
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title={t("homeCurrency")}
            value={`${settings.currencyName} — ${settings.currencyCode}`}
            hint={t("homeCurrencyHint")}
            leading={
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                {settings.symbol}
              </div>
            }
          />
          <SummaryCard
            title={t("currencyFormat")}
            value={formattedCurrentValue}
            hint={t("currencyFormatHint")}
          />
          <SummaryCard
            title={t("fields.numberFormat")}
            value={formatOrgNumber(1234567.89, 2, settings.numberFormat)}
            hint={t("numberFormatHint")}
          />
        </div>
      </FormSectionCard>

      <AppModal
        open={isModalOpen}
        onClose={() => (!isSaving ? setIsModalOpen(false) : undefined)}
        title={t("customizeCurrencySettings")}
        size="lg"
        isBusy={isSaving}
        footer={
          <>
            <AppButton
              variant="secondary"
              type="button"
              disabled={isSaving}
              onClick={() => setIsModalOpen(false)}
            >
              {t("cancel")}
            </AppButton>
            <AppButton
              variant="primary"
              type="button"
              disabled={isSaving}
              onClick={() => void handleConfirm()}
            >
              {isSaving ? t("saving") : t("confirm")}
            </AppButton>
          </>
        }
      >
        {/* Top labels in modal — left-aligned labels collide in this narrow dialog. */}
        <div className="dash-appearance-scope space-y-5" data-form-label="top">
          <FieldGroup label={t("homeCurrency")} htmlFor="currency-code" required>
            <CheckmarkSelect
              id="currency-code"
              listLabel={t("homeCurrency")}
              options={currencyOptions}
              value={tempSettings.currencyCode}
              onChange={handleCurrencyChange}
              searchable
              portaled
              className="w-full"
            />
          </FieldGroup>

          <FieldGroup label={t("currencyFormat")} htmlFor="currency-format">
            <div
              id="currency-format"
              role="group"
              aria-label={t("currencyFormat")}
              className="flex h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800"
            >
              {(
                [
                  { kind: "symbol" as const, label: t("symbol") },
                  { kind: "code" as const, label: t("formatTypeCode") },
                ] as const
              ).map(({ kind, label }) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => handleTempChange("formatType", kind)}
                  className={cn(
                    "min-w-0 flex-1 truncate rounded-lg px-2 text-sm font-semibold transition",
                    tempSettings.formatType === kind
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label={t("symbol")} htmlFor="currency-symbol">
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

          <FieldGroup label={t("symbolPosition")} htmlFor="currency-position" required>
            <CheckmarkSelect
              id="currency-position"
              listLabel={t("symbolPosition")}
              options={[
                { value: "before", label: t("symbolBefore") },
                { value: "after", label: t("symbolAfter") },
              ]}
              value={tempSettings.symbolPosition}
              onChange={(v) => handleTempChange("symbolPosition", v)}
              portaled
              className="w-full"
            />
          </FieldGroup>

          <FieldGroup label={t("decimalPlaces")} htmlFor="currency-decimals" required>
            <NumericInput
              id="currency-decimals"
              integer
              value={tempSettings.decimalPlaces}
              onChange={(next) => {
                const n = Number.parseInt(next, 10);
                handleTempChange(
                  "decimalPlaces",
                  Number.isFinite(n) ? Math.max(0, Math.min(6, n)) : 0,
                );
              }}
            />
          </FieldGroup>

          <FieldGroup label={t("currencyDigitFormat")} htmlFor="modal-currency-digit-format">
            <CheckmarkSelect
              id="modal-currency-digit-format"
              listLabel={t("currencyDigitFormat")}
              options={numberFormatOptions}
              value={tempSettings.digitSeparator}
              onChange={(v) => handleTempChange("digitSeparator", normalizeOrgNumberFormat(v))}
              portaled
              className="w-full"
            />
          </FieldGroup>

          <FieldGroup label={t("fields.numberFormat")} htmlFor="modal-org-number-format">
            <CheckmarkSelect
              id="modal-org-number-format"
              listLabel={t("fields.numberFormat")}
              options={numberFormatOptions}
              value={tempSettings.numberFormat}
              onChange={(v) => handleTempChange("numberFormat", normalizeOrgNumberFormat(v))}
              portaled
              className="w-full"
            />
          </FieldGroup>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <Eye className="size-3.5 shrink-0" aria-hidden />
              {t("preview")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("currencyFormat")}
                </span>
                <span className="mt-0.5 block truncate text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100 sm:text-lg">
                  {formattedPreviewValue}
                </span>
                <p className="mt-1 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
                  {t("currencyFormatHint")}
                </p>
              </div>
              <div className="min-w-0">
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("fields.numberFormat")}
                </span>
                <span className="mt-0.5 block truncate text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100 sm:text-lg">
                  {formatOrgNumber(1234567.89, 2, tempSettings.numberFormat)}
                </span>
                <p className="mt-1 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
                  {t("numberFormatHint")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default CompanySettingsCurrency;
