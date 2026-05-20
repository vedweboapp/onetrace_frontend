"use client";

import React, { useState } from "react";
import { Eye, X } from "lucide-react";
import { currencyList } from "@/shared/form/components/currency-list";
import { getOrganizationDetails, updateOrganizationDetails } from "../api/company-settings.api";
import { toast } from "sonner";
import { OrganizationDetails } from "../types/types";

interface CurrencySettings {
  currencyCode: string;
  currencyName: string;
  formatType: "symbol" | "code";
  symbol: string;
  symbolPosition: "before" | "after";
  digitSeparator: string;
  decimalPlaces: number;
}

interface CompanySettingsCurrencyProps {
  initialData: OrganizationDetails;
  onSaveSuccess?: (data: OrganizationDetails) => void;
}

const CompanySettingsCurrency = ({ initialData, onSaveSuccess }: CompanySettingsCurrencyProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Main settings state
  const [settings, setSettings] = useState<CurrencySettings>({
    currencyCode: initialData.currencyCode || "INR",
    currencyName: initialData.currencyName || "Indian Rupee",
    formatType: (initialData.formatType as "symbol" | "code") || "symbol",
    symbol: initialData.symbol || "₹",
    symbolPosition: (initialData.symbolPosition as "before" | "after") || "before",
    digitSeparator: initialData.digitSeparator || "1,234,567.89",
    decimalPlaces: initialData.decimalPlaces !== undefined ? initialData.decimalPlaces : 2,
  });

  // Modal open/close state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Temporary settings for editing in modal
  const [tempSettings, setTempSettings] = useState<CurrencySettings>({ ...settings });

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Format helper function
  const formatCurrencyValue = (
    value: number,
    formatType: "symbol" | "code",
    symbol: string,
    code: string,
    symbolPosition: "before" | "after",
    digitSeparator: string,
    decimalPlaces: number
  ) => {
    const decimals = isNaN(Number(decimalPlaces)) ? 2 : Number(decimalPlaces);
    const parts = value.toFixed(decimals).split(".");
    const integerPart = parts[0];
    const decimalPart = parts[1] ? "." + parts[1] : "";

    let formattedInteger = "";

    if (digitSeparator === "12,34,567.89") {
      // Indian formatting (lakhs, crores)
      let lastThree = integerPart.substring(integerPart.length - 3);
      const otherBits = integerPart.substring(0, integerPart.length - 3);
      if (otherBits !== "") {
        lastThree = "," + lastThree;
      }
      formattedInteger = otherBits.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
    } else if (digitSeparator === "1.234.567,89") {
      // European formatting
      formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    } else if (digitSeparator === "1 234 567.89") {
      // Space formatting
      formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    } else {
      // Standard US/UK formatting (1,234,567.89)
      formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // Combine integer and decimal parts
    let formattedNumber = "";
    if (digitSeparator === "1.234.567,89") {
      // uses comma for decimals
      formattedNumber = formattedInteger + (parts[1] ? "," + parts[1] : "");
    } else {
      formattedNumber = formattedInteger + decimalPart;
    }

    // Add prefix/suffix
    const prefixOrSuffix = formatType === "symbol" ? symbol : code;

    if (symbolPosition === "before") {
      return `${prefixOrSuffix} ${formattedNumber}`;
    } else {
      return `${formattedNumber} ${prefixOrSuffix}`;
    }
  };

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
      const payload = {
        ...initialData,
        ...tempSettings
      };
      
      await updateOrganizationDetails(1, payload);
      setSettings({ ...tempSettings });
      setIsModalOpen(false);
      toast.success("Currency settings saved successfully");
      onSaveSuccess?.(payload as any);
    } catch (error) {
      console.error("Failed to save organization currency:", error);
      toast.error("Failed to save currency settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Live formatted previews
  const formattedCurrentValue = formatCurrencyValue(
    1234567.89,
    settings.formatType,
    settings.symbol,
    settings.currencyCode,
    settings.symbolPosition,
    settings.digitSeparator,
    settings.decimalPlaces
  );

  const formattedPreviewValue = formatCurrencyValue(
    1234567.89,
    tempSettings.formatType,
    tempSettings.symbol,
    tempSettings.currencyCode,
    tempSettings.symbolPosition,
    tempSettings.digitSeparator,
    tempSettings.decimalPlaces
  );

  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 p-8 shadow-sm flex flex-col gap-6 mt-2 transition-opacity duration-500 ${isMounted ? "animate-in fade-in duration-500 opacity-100" : "opacity-0"}`}>
      {/* Home Currency Block */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Home Currency</h3>
        <div className="bg-slate-50 border border-slate-100 rounded-[8px] p-4 flex items-center gap-4 hover:border-slate-200 transition-colors">
          <div className="size-12 bg-white rounded-[8px] border border-slate-200 flex items-center justify-center shadow-sm">
            <span className="text-xl font-bold text-slate-700">{settings.symbol}</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-base">
              {settings.currencyName} - {settings.currencyCode}
            </h4>
            <p className="text-xs text-slate-400 font-medium">Your primary currency</p>
          </div>
        </div>
      </div>

      {/* Format Block */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Format</h3>
        <div className="bg-slate-50 border border-slate-100 rounded-[8px] p-4 flex items-center justify-between hover:border-slate-200 transition-colors">
          <div>
            <h4 className="font-bold text-slate-800 text-lg tracking-tight">
              {formattedCurrentValue}
            </h4>
            <p className="text-xs text-slate-400 font-medium">Current format</p>
          </div>
          <button
            onClick={handleOpenCustomize}
            className="px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 active:scale-[0.98] transition-all text-white text-sm font-semibold rounded-[8px] shadow-sm cursor-pointer animate-none"
          >
            Customize
          </button>
        </div>
      </div>

      {/* Customize Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Change Home Currency
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
                aria-label="Close"
              >
                <X className="size-4.5 shrink-0" strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-6 space-y-4">
              {/* Home Currency Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Home Currency
                </label>
                <select
                  value={tempSettings.currencyCode}
                  onChange={handleCurrencyChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium shadow-sm transition"
                >
                  {currencyList.map((currency) => (
                    <option
                      key={`${currency.countryCode}-${currency.value}`}
                      value={currency.value}
                    >
                      {currency.label} - {currency.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Format Switcher & Symbol Inputs row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Format
                  </label>
                  <div className="flex bg-slate-100/80 border border-slate-200/60 rounded-[8px] p-0.5 w-full">
                    <button
                      type="button"
                      onClick={() => handleTempChange("formatType", "symbol")}
                      className={`flex-1 text-center py-1.5 text-xs font-bold rounded-[6px] transition duration-150 cursor-pointer ${
                        tempSettings.formatType === "symbol"
                          ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Symbol
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTempChange("formatType", "code")}
                      className={`flex-1 text-center py-1.5 text-xs font-bold rounded-[6px] transition duration-150 cursor-pointer ${
                        tempSettings.formatType === "code"
                          ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Code
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Symbol
                  </label>
                  <input
                    type="text"
                    value={tempSettings.formatType === "symbol" ? tempSettings.symbol : tempSettings.currencyCode}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-slate-800 bg-slate-50/50 outline-none text-sm font-semibold shadow-sm transition cursor-not-allowed select-none"
                  />
                </div>
              </div>

              {/* Symbol Position Select */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Symbol Position
                </label>
                <select
                  value={tempSettings.symbolPosition}
                  onChange={(e) => handleTempChange("symbolPosition", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-[8px] text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium shadow-sm transition"
                >
                  <option value="before">Before Value</option>
                  <option value="after">After Value</option>
                </select>
              </div>

              {/* Decimal Places */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Decimal Places
                </label>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={tempSettings.decimalPlaces}
                  onChange={(e) => handleTempChange("decimalPlaces", parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-[8px] text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-semibold shadow-sm transition"
                />
              </div>

              {/* Preview dashed box */}
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[8px] p-4 flex items-center gap-4 mt-6">
                <div className="size-10 bg-white border border-slate-200 rounded-[8px] flex items-center justify-center shadow-sm shrink-0">
                  <Eye className="size-5 text-slate-400" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                    PREVIEW
                  </span>
                  <span className="text-lg font-extrabold text-slate-800 tracking-tight block mt-0.5">
                    {formattedPreviewValue}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] rounded-[8px] text-slate-600 transition text-sm font-semibold shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving}
                className="px-5 py-2 bg-[#0F172A] hover:bg-slate-800 active:scale-[0.98] transition text-white text-sm font-semibold rounded-[8px] shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySettingsCurrency;