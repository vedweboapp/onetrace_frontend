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
  FormFieldRow,
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
  action,
  leading,
}: {
  title: string;
  value: React.ReactNode;
  hint: string;
  action?: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col gap-3 rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {leading}
          <div className="min-w-0">
            <div className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-lg">
              {value}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
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

  const saveNumberFormat = async (next: string) => {
    const normalized = normalizeOrgNumberFormat(next);
    setSettings((prev) => ({ ...prev, numberFormat: normalized }));
    try {
      const current: OrganizationDetails = {
        ...initialData,
        ...settings,
        numberFormat: normalized,
      };
      const patch = buildDirtyOrganizationPatch(initialData, current, ["numberFormat"]);
      if (!hasDirtyFields(patch)) return;
      const updated = await updateOrganizationDetails(1, patch);
      toastSuccess(t("currencyUpdatedToast"));
      onSaveSuccess?.(updated);
    } catch (error) {
      toastApiError(error);
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
      >
        <p className="-mt-3 mb-1 text-sm text-slate-500 dark:text-slate-400">
          {t("currencySectionSubtitle")}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
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
            title={t("format")}
            value={formattedCurrentValue}
            hint={t("formatHint")}
            action={
              <AppButton variant="primary" size="sm" type="button" onClick={handleOpenCustomize}>
                {t("customize")}
              </AppButton>
            }
          />
        </div>
      </FormSectionCard>

      <FormSectionCard title={t("numberFormatSectionTitle")}>
        <p className="-mt-3 mb-1 text-sm text-slate-500 dark:text-slate-400">
          {t("numberFormatSectionSubtitle")}
        </p>
        <FormFieldRow cols="2" from="md" className="items-end">
          <div className="min-w-0 rounded-xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("numberPreview")}
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {formatOrgNumber(1234567.89, 2, settings.numberFormat)}
            </p>
          </div>
          <FieldGroup label={t("fields.numberFormat")} htmlFor="org-number-format">
            <CheckmarkSelect
              id="org-number-format"
              listLabel={t("fields.numberFormat")}
              options={numberFormatOptions}
              value={settings.numberFormat}
              onChange={(v) => void saveNumberFormat(v)}
              className="w-full"
              portaled
            />
          </FieldGroup>
        </FormFieldRow>
      </FormSectionCard>

      <AppModal
        open={isModalOpen}
        onClose={() => (!isSaving ? setIsModalOpen(false) : undefined)}
        title={t("changeHomeCurrency")}
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
        <div className="settings-aligned-fields space-y-4">
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

          <FormFieldRow cols="2">
            <FieldGroup label={t("format")} htmlFor="currency-format">
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
          </FormFieldRow>

          <FormFieldRow cols="2">
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
          </FormFieldRow>

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

          <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600">
              <Eye className="size-5 text-slate-400" aria-hidden />
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {t("preview")}
              </span>
              <span className="mt-0.5 block text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {formattedPreviewValue}
              </span>
            </div>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default CompanySettingsCurrency;
