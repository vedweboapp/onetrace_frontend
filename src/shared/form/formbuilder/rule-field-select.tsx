"use client";

import React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/core/utils/http.util";

type FieldOptionValue = string | number;
type FieldOption = string | { label: string; value: FieldOptionValue };

export type RuleFieldOption = {
  value: string;
  label: string;
  type?: string;
  options?: FieldOption[];
  apiName?: string;
  targetType?: "field" | "section";
  fieldId?: string | number | null;
  fieldUid?: string;
  sectionId?: string | number | null;
  sectionUid?: string;
  s_id?: number | string | null;
  u_id?: string;
  sectionKey?: string;
  sectionLabel?: string;
  optionKind?: "section" | "field";
};

type RuleFieldSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: RuleFieldOption[];
  placeholder: string;
  invalid?: boolean;
  className?: string;
  listLabel?: string;
};

type RuleFieldGroup = {
  key: string;
  label: string;
  options: RuleFieldOption[];
};

const groupOptions = (options: RuleFieldOption[]): RuleFieldGroup[] => {
  const groups: RuleFieldGroup[] = [];
  const seen = new Map<string, RuleFieldGroup>();

  options.forEach((option) => {
    const key = option.sectionKey || "__ungrouped__";
    let group = seen.get(key);
    if (!group) {
      group = {
        key,
        label: option.sectionLabel || "Fields",
        options: [],
      };
      seen.set(key, group);
      groups.push(group);
    }
    group.options.push(option);
  });

  return groups;
};

export function RuleFieldSelect({
  value,
  onChange,
  options,
  placeholder,
  invalid,
  className,
  listLabel = "Fields",
}: RuleFieldSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  React.useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const filteredOptions = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => {
      const label = option.label.toLowerCase();
      const section = (option.sectionLabel || "").toLowerCase();
      return label.includes(query) || section.includes(query);
    });
  }, [options, search]);

  const groups = React.useMemo(() => groupOptions(filteredOptions), [filteredOptions]);

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-sm font-medium outline-none transition",
          "hover:border-[color:var(--dash-accent,#111111)] focus:ring-2 focus:ring-[color:var(--dash-accent,#111111)]/20",
          "dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700",
          invalid ? "border-red-500 dark:border-red-500" : "border-gray-300",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => {
            if (!current) setSearch("");
            return !current;
          });
        }}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-slate-400 dark:text-slate-500")}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 transition", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900">
          <div className="relative border-b border-slate-200 p-2 dark:border-slate-700">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-sm outline-none focus:border-[color:var(--dash-accent,#111111)] focus:ring-2 focus:ring-[color:var(--dash-accent,#111111)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Search fields..."
            />
          </div>
          <div role="listbox" aria-label={listLabel} className="max-h-72 overflow-y-auto py-1">
            {groups.map((group) => (
              <div key={group.key}>
                <div className="sticky top-0 z-[1] border-y border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 first:border-t-0 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                  {group.label}
                </div>
                {group.options.map((option) => {
                  const isSelected = option.value === value;
                  const isSection = option.optionKind === "section";
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition",
                        isSelected
                          ? "bg-slate-50 font-semibold text-[color:var(--dash-accent,#111111)] dark:bg-slate-800"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
                      )}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("size-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} aria-hidden />
                      <span className={cn("min-w-0 flex-1 truncate", isSection && "font-semibold")}>
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            {groups.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">No fields found</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
