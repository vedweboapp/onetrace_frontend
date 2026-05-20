"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { cn } from "@/core/utils/http.util";
import { surfaceInputClassName } from "@/shared/ui/field-primitives";

type Props = {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSelectPlace: (place: PlaceSuggestion) => void;
  countryIso?: string;
  /** Biases search toward selected locality (city, state, country name). */
  contextCity?: string;
  contextState?: string;
  contextCountry?: string;
  contextPincode?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  error?: string;
  /** Secondary line — same suggestions, fills line 2 on select */
  variant?: "primary" | "secondary";
};

export function AddressPlaceAutocomplete({
  id,
  label,
  value,
  onChange,
  onBlur,
  onSelectPlace,
  countryIso,
  contextCity,
  contextState,
  contextCountry,
  contextPincode,
  placeholder,
  disabled,
  invalid,
  required,
  error,
  variant = "primary",
}: Props) {
  const t = useTranslations("Dashboard.sites.location");
  const listId = `${id}-suggestions`;
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<PlaceSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const skipSearchRef = React.useRef(false);

  React.useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const tid = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q });
        if (countryIso?.trim()) params.set("country", countryIso.trim().toLowerCase());
        const city = contextCity?.trim();
        const state = contextState?.trim();
        const country = contextCountry?.trim();
        if (city) params.set("city", city);
        if (state) params.set("state", state);
        if (country) params.set("countryName", country);
        const pin = contextPincode?.trim();
        if (pin) params.set("pincode", pin);
        const res = await fetch(`/api/places?${params}`);
        if (cancelled) return;
        if (!res.ok) {
          setItems([]);
          return;
        }
        const json = (await res.json()) as { results?: PlaceSuggestion[] };
        setItems(json.results ?? []);
        setActiveIndex(-1);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [value, countryIso, contextCity, contextState, contextCountry, contextPincode]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(place: PlaceSuggestion) {
    skipSearchRef.current = true;
    onSelectPlace(place);
    setOpen(false);
    setItems([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const row = items[activeIndex];
      if (row) pick(row);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && value.trim().length >= 2 && (loading || items.length > 0);

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder ?? (variant === "primary" ? t("searchPlaceholder") : t("searchPlaceholderLine2"))}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            onBlur?.();
          }, 150);
        }}
        onKeyDown={onKeyDown}
        className={cn(surfaceInputClassName, invalid && "border-red-500 dark:border-red-500")}
      />
      {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[200] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-slate-500">{t("searching")}</li>
          ) : items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">{t("noResults")}</li>
          ) : (
            items.map((place, idx) => (
              <li key={place.id} role="option" aria-selected={idx === activeIndex}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm transition-colors",
                    idx === activeIndex
                      ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(place)}
                >
                  <span className="block font-medium">{place.line1}</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{place.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
