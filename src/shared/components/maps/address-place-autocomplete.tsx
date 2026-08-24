"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { isGoogleMapsEnabled } from "@/shared/utils/google-maps-loader.util";
import {
  fetchGooglePlaceDetails,
  fetchGooglePlacePredictions,
  isPincodeLikeQuery,
  type GooglePlacePrediction,
} from "@/shared/utils/google-places-autocomplete.util";
import { cn } from "@/core/utils/http.util";
import {
  fieldLabelClassName,
  fieldRequiredMarkClassName,
  surfaceInputClassName,
} from "@/shared/ui/field-primitives";
import { FIELD_MAX_LENGTH } from "@/shared/form/field-max-length.util";
import { sanitizeAddressInput } from "@/shared/form/field-input.util";

type Props = {
  id: string;
  /** When omitted, parent `FieldGroup` owns the label (Appearance layout). */
  label?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSelectPlace: (place: PlaceSuggestion) => void;
  countryIso?: string;
  contextCity?: string;
  contextState?: string;
  contextCountry?: string;
  contextPincode?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  error?: string;
  variant?: "primary" | "secondary";
  maxLength?: number;
  /** Override input/textarea surface (detail inline edit). */
  inputClassName?: string;
  /** Grow like detail display values (wrap long address lines). */
  multiline?: boolean;
  /** Portal suggestions so narrow columns don't squash the menu. */
  portaled?: boolean;
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
  maxLength = FIELD_MAX_LENGTH.ADDRESS_LINE,
  inputClassName,
  multiline = false,
  portaled = false,
}: Props) {
  const t = useTranslations("Dashboard.sites.location");
  const listId = `${id}-suggestions`;
  const useGooglePlaces = variant === "primary" && isGoogleMapsEnabled();

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [nominatimItems, setNominatimItems] = React.useState<PlaceSuggestion[]>(
    [],
  );
  const [googlePredictions, setGooglePredictions] = React.useState<
    GooglePlacePrediction[]
  >([]);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [resolvingPlace, setResolvingPlace] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const controlRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const skipSearchRef = React.useRef(false);

  React.useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const q = value.trim();
    if (q.length < 2) {
      setNominatimItems([]);
      setGooglePredictions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const tid = window.setTimeout(async () => {
      try {
        if (useGooglePlaces) {
          const predictions = await fetchGooglePlacePredictions(q, {
            countryIso,
            contextCountry,
          });
          if (cancelled) return;
          setGooglePredictions(predictions);
          setNominatimItems([]);
          setActiveIndex(-1);
          return;
        }

        const params = new URLSearchParams({ q });
        if (countryIso?.trim())
          params.set("country", countryIso.trim().toLowerCase());
        if (contextCity?.trim()) params.set("city", contextCity.trim());
        if (contextState?.trim()) params.set("state", contextState.trim());
        if (contextCountry?.trim())
          params.set("countryName", contextCountry.trim());
        if (contextPincode?.trim())
          params.set("pincode", contextPincode.trim());

        const res = await fetch(`/api/places?${params}`);
        if (cancelled) return;
        if (!res.ok) {
          setNominatimItems([]);
          return;
        }
        const json = (await res.json()) as { results?: PlaceSuggestion[] };
        setNominatimItems(json.results ?? []);
        setGooglePredictions([]);
        setActiveIndex(-1);
      } catch {
        if (!cancelled) {
          setNominatimItems([]);
          setGooglePredictions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [
    value,
    countryIso,
    contextCity,
    contextState,
    contextCountry,
    contextPincode,
    useGooglePlaces,
  ]);

  React.useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (wrapRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-ot-place-suggest]")) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

  async function pickNominatim(place: PlaceSuggestion) {
    skipSearchRef.current = true;
    onSelectPlace(place);
    setOpen(false);
    setNominatimItems([]);
    setGooglePredictions([]);
  }

  async function pickGoogle(prediction: GooglePlacePrediction) {
    if (!prediction.placeId || resolvingPlace) return;
    setResolvingPlace(true);
    try {
      const main = prediction.structured_formatting?.main_text?.trim();
      const secondary = prediction.structured_formatting?.secondary_text?.trim();
      const description = prediction.description?.trim();
      const place = await fetchGooglePlaceDetails(prediction);
      if (!place) return;

      const addressLine1 =
        description ||
        [main, secondary].filter(Boolean).join(", ") ||
        place.label ||
        place.line1;

      skipSearchRef.current = true;
      onChange(addressLine1);
      onSelectPlace({
        ...place,
        line1: addressLine1,
        label: description || place.label,
      });
      setOpen(false);
      setGooglePredictions([]);
      setNominatimItems([]);
    } finally {
      setResolvingPlace(false);
    }
  }

  const googleCount = googlePredictions.length;
  const nominatimCount = nominatimItems.length;
  const totalCount = useGooglePlaces ? googleCount : nominatimCount;
  const showList =
    open &&
    value.trim().length >= 2 &&
    (loading || resolvingPlace || totalCount > 0);

  React.useEffect(() => {
    if (!showList || !portaled) {
      setMenuPos(null);
      return;
    }
    function updatePos() {
      const el = controlRef.current ?? wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuPos({
        top: r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 280),
      });
    }
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [showList, portaled, value]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (!showList || totalCount === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % totalCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? totalCount - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      if (useGooglePlaces) {
        const row = googlePredictions[activeIndex];
        if (row) void pickGoogle(row);
      } else {
        const row = nominatimItems[activeIndex];
        if (row) void pickNominatim(row);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const controlClassName = cn(
    multiline
      ? cn(
          surfaceInputClassName,
          "h-auto min-h-[2.5rem] resize-none py-1.5 leading-normal [field-sizing:content]",
        )
      : surfaceInputClassName,
    invalid && "border-red-500 dark:border-red-500",
    inputClassName,
  );

  const textareaRows = Math.min(
    6,
    Math.max(2, Math.ceil(Math.max(value.length, 1) / 42)),
  );

  const listBody = (
    <>
      {loading || resolvingPlace ? (
        <li className="px-3 py-2.5 text-sm text-slate-500">
          {resolvingPlace ? t("resolvingPlace") : t("searching")}
        </li>
      ) : useGooglePlaces ? (
        googleCount === 0 ? (
          <li className="px-3 py-2.5 text-sm text-slate-500">{t("noResults")}</li>
        ) : (
          googlePredictions.map((prediction, idx) => {
            const pincodeQuery = isPincodeLikeQuery(value);
            const main =
              prediction.structured_formatting?.main_text ?? prediction.description;
            const secondary = prediction.structured_formatting?.secondary_text ?? "";
            const displayLabel = pincodeQuery
              ? prediction.description
              : secondary
                ? `${main}, ${secondary}`
                : main;
            return (
              <li key={prediction.placeId} role="option" aria-selected={idx === activeIndex}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full gap-2.5 px-3 py-2.5 text-left text-sm transition-colors",
                    idx === activeIndex
                      ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void pickGoogle(prediction)}
                >
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-medium text-slate-900 dark:text-slate-100">
                      {pincodeQuery ? displayLabel : main}
                    </span>
                    {!pincodeQuery && secondary ? (
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                        {secondary}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })
        )
      ) : nominatimCount === 0 ? (
        <li className="px-3 py-2.5 text-sm text-slate-500">{t("noResults")}</li>
      ) : (
        nominatimItems.map((place, idx) => (
          <li key={place.id} role="option" aria-selected={idx === activeIndex}>
            <button
              type="button"
              className={cn(
                "w-full px-3 py-2.5 text-left text-sm transition-colors",
                idx === activeIndex
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60",
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void pickNominatim(place)}
            >
              <span className="block break-words font-medium">{place.line1}</span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                {place.label}
              </span>
            </button>
          </li>
        ))
      )}
    </>
  );

  const listClassName =
    "z-[1200] max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900";

  return (
    <div ref={wrapRef} className="relative w-full min-w-0 overflow-visible">
      {label != null && label !== "" ? (
        <label htmlFor={id} className={fieldLabelClassName}>
          {label}
          {required ? (
            <span className={cn(fieldRequiredMarkClassName, "field-required-asterisk")} aria-hidden>
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {multiline ? (
        <textarea
          ref={controlRef as React.RefObject<HTMLTextAreaElement>}
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listId : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled || resolvingPlace}
          placeholder={
            placeholder ??
            (variant === "primary"
              ? useGooglePlaces
                ? t("googleSearchPlaceholder")
                : t("searchPlaceholder")
              : t("searchPlaceholderLine2"))
          }
          value={value}
          maxLength={maxLength}
          rows={textareaRows}
          onChange={(e) => {
            onChange(sanitizeAddressInput(e.target.value, maxLength));
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false);
              onBlur?.();
            }, 200);
          }}
          onKeyDown={onKeyDown}
          className={controlClassName}
        />
      ) : (
        <input
          ref={controlRef as React.RefObject<HTMLInputElement>}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listId : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled || resolvingPlace}
          placeholder={
            placeholder ??
            (variant === "primary"
              ? useGooglePlaces
                ? t("googleSearchPlaceholder")
                : t("searchPlaceholder")
              : t("searchPlaceholderLine2"))
          }
          value={value}
          maxLength={maxLength}
          onChange={(e) => {
            onChange(sanitizeAddressInput(e.target.value, maxLength));
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false);
              onBlur?.();
            }, 200);
          }}
          onKeyDown={onKeyDown}
          className={controlClassName}
        />
      )}
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {showList && !portaled ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            listClassName,
            "absolute left-0 right-0 mt-1 min-w-full w-max max-w-[min(28rem,calc(100vw-1.5rem))]",
          )}
        >
          {listBody}
        </ul>
      ) : null}

      {showList &&
      portaled &&
      menuPos &&
      typeof document !== "undefined"
        ? createPortal(
            <ul
              id={listId}
              role="listbox"
              data-ot-place-suggest=""
              className={listClassName}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: menuPos.top,
                left: Math.min(menuPos.left, window.innerWidth - menuPos.width - 8),
                width: menuPos.width,
              }}
            >
              {listBody}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
