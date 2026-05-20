"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { surfaceInputClassName } from "./field-primitives";

type Props = {
  value: string;
  onCommit: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
  inputId?: string;
  debounceMs?: number;
};

export function ListPageSearchField({
  value,
  onCommit,
  placeholder,
  ariaLabel,
  className,
  inputId,
  debounceMs = 400,
}: Props) {
  const [local, setLocal] = React.useState(value);

  React.useEffect(() => {
    setLocal(value);
  }, [value]);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = local.trim();
      const urlTrimmed = value.trim();
      if (trimmed !== urlTrimmed) {
        onCommit(local);
      }
    }, debounceMs);
    return () => window.clearTimeout(t);
  }, [debounceMs, local, onCommit, value]);

  return (
    <div className={cn("relative min-w-0 flex-1 sm:max-w-sm", className)}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        strokeWidth={2}
        aria-hidden
      />
      <input
        id={inputId}
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        className={cn(surfaceInputClassName, "pl-10")}
      />
    </div>
  );
}
