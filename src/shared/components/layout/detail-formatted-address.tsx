import type { ReactNode } from "react";
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
  const city = parts.city?.trim() ?? "";
  const state = parts.state?.trim() ?? "";
  const pin = parts.pincode?.trim() ?? "";
  const head = [city, state].filter(Boolean).join(", ");
  if (head && pin) return `${head} ${pin}`;
  if (head) return head;
  return pin;
}

type DetailFormattedAddressProps = DetailAddressParts & {
  /** Single free-text address when structured fields are all empty */
  legacySingleLine?: string | null;
  /** Shown on the “line 2” row when line 2 is blank but line 1 exists (e.g. “Not provided”) */
  line2Fallback?: string;
  emptyMessage: ReactNode;
  className?: string;
};

/**
 * Renders a mailing-style address: street lines, then “City, State PIN”, then country on its own line.
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
}: DetailFormattedAddressProps) {
  const l1 = line1?.trim() ?? "";
  const l2 = line2?.trim() ?? "";
  const structured = hasDetailAddress({ line1, line2, city, state, pincode, country });
  const legacy = legacySingleLine?.trim() ?? "";

  if (!structured && legacy) {
    return (
      <address className={cn("not-italic", className)}>
        <div className="rounded-lg border border-slate-200/90 bg-slate-50/70 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/45">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">{legacy}</p>
        </div>
      </address>
    );
  }

  if (!structured) {
    return <div className={cn(className)}>{emptyMessage}</div>;
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
      <div className="rounded-lg border border-slate-200/90 bg-slate-50/70 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/45">
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
