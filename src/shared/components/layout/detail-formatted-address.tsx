"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/core/utils/http.util";

export type DetailAddressParts = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
};

export function hasDetailAddress(parts: DetailAddressParts): boolean {
  return !!(
    parts.line1?.trim() ||
    parts.line2?.trim() ||
    parts.city?.trim() ||
    parts.state?.trim() ||
    parts.country?.trim() ||
    parts.pincode?.trim()
  );
}

function buildCityStatePinLine(parts: Pick<DetailAddressParts, "city" | "state" | "pincode">): string {
  const c = parts.city?.trim() ?? "";
  const s = parts.state?.trim() ?? "";
  const pin = parts.pincode?.trim() ?? "";
  const head = [c, s].filter(Boolean).join(", ");
  if (head && pin) return `${head} ${pin}`;
  if (head) return head;
  return pin;
}

type LabeledRowsProps = DetailAddressParts & { line2Fallback?: string };

/** Same breakpoints as record cards: 1 col mobile, 2 columns from `sm` through `lg`. */
const ADDRESS_FIELD_GRID = cn("grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-2");

function LabeledAddressRows({ line1, line2, city, state, pincode, country, line2Fallback }: LabeledRowsProps) {
  const t = useTranslations("Dashboard.common.address");
  const l1 = line1?.trim() ?? "";
  const l2 = line2?.trim() ?? "";
  const hasL1 = !!l1;
  const line2Muted = hasL1 && !l2 && !!line2Fallback;
  const line2Display = l2 || (line2Muted ? line2Fallback! : "");

  const field = (key: string, label: string, value: string, valueMuted?: boolean) => (
    <div key={key} className="min-w-0">
      <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={cn(
          "mt-1.5 break-words text-sm font-medium leading-snug text-slate-900 dark:text-slate-100",
          valueMuted && "font-normal text-slate-500 dark:text-slate-400",
        )}
      >
        {value.trim() ? value : "—"}
      </p>
    </div>
  );

  return (
    <div className={ADDRESS_FIELD_GRID}>
      {field("l1", t("line1"), l1)}
      {field("l2", t("line2"), line2Display, line2Muted)}
      {field("city", t("city"), city?.trim() ?? "")}
      {field("state", t("state"), state?.trim() ?? "")}
      {field("pin", t("pincode"), pincode?.trim() ?? "")}
      {field("ctry", t("country"), country?.trim() ?? "")}
    </div>
  );
}

type DetailFormattedAddressProps = DetailAddressParts & {
  legacySingleLine?: string | null;
  line2Fallback?: string;
  emptyMessage: ReactNode;
  className?: string;
  variant?: "labeled" | "postal";
};

/**
 * Renders address fields: default **labeled** layout in a responsive grid (same columns as typical **Record**
 * sections: 1 column on small screens, 2 from `sm` upward). Use `variant="postal"` for a compact mailing-style block.
 */
export function DetailFormattedAddress({
  line1,
  line2,
  city,
  state,
  pincode,
  country,
  legacySingleLine,
  line2Fallback,
  emptyMessage,
  className,
  variant = "labeled",
}: DetailFormattedAddressProps) {
  const t = useTranslations("Dashboard.common.address");
  const l1 = line1?.trim() ?? "";
  const l2 = line2?.trim() ?? "";
  const structured = hasDetailAddress({ line1, line2, city, state, pincode, country });
  const legacy = legacySingleLine?.trim() ?? "";

  if (!structured && legacy) {
    return (
      <div className={cn(className)}>
        <div className={ADDRESS_FIELD_GRID}>
          <div className="min-w-0 sm:col-span-2">
            <p className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400">{t("legacy")}</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-900 dark:text-slate-100">
              {legacy}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!structured) {
    return <div className={cn(className)}>{emptyMessage}</div>;
  }

  if (variant === "labeled") {
    return (
      <address className={cn("not-italic", className)}>
        <LabeledAddressRows
          line1={line1}
          line2={line2}
          city={city}
          state={state}
          pincode={pincode}
          country={country}
          line2Fallback={line2Fallback}
        />
      </address>
    );
  }

  const cityLine = buildCityStatePinLine({ city, state, pincode });
  const ctry = country?.trim() ?? "";

  type Row = { text: string; muted?: boolean; prominent?: boolean };
  const rows: Row[] = [];
  if (l1) {
    rows.push({ text: l1, prominent: true });
    if (l2) rows.push({ text: l2 });
    else if (line2Fallback) rows.push({ text: line2Fallback, muted: true });
  } else if (l2) {
    rows.push({ text: l2, prominent: true });
  }
  if (cityLine) rows.push({ text: cityLine });
  if (ctry) rows.push({ text: ctry });

  return (
    <address className={cn("not-italic", className)}>
      <div className="rounded-md border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/35">
        <div className="space-y-1 text-sm leading-relaxed">
          {rows.map((row, i) => (
            <p
              key={`${row.text}-${i}`}
              className={cn(
                row.prominent && "font-medium text-slate-900 dark:text-slate-100",
                !row.prominent && !row.muted && "text-slate-800 dark:text-slate-200",
                row.muted && "text-slate-500 dark:text-slate-400",
              )}
            >
              {row.text}
            </p>
          ))}
        </div>
      </div>
    </address>
  );
}
