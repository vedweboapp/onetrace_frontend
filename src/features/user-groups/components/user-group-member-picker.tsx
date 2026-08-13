"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/core/utils/http.util";

export type UserPickerOption = {
  id: number;
  label: string;
  subtitle?: string;
};

type Props = {
  options: UserPickerOption[];
  selectedIds: number[];
  onChange: (next: number[]) => void;
  availableTitle: string;
  selectedTitle: string;
  emptyAvailable: string;
  emptySelected: string;
  disabled?: boolean;
  invalid?: boolean;
};

export function UserGroupMemberPicker({
  options,
  selectedIds,
  onChange,
  availableTitle,
  selectedTitle,
  emptyAvailable,
  emptySelected,
  disabled,
  invalid,
}: Props) {
  const selectedSet = new Set(selectedIds);
  const available = options.filter((o) => !selectedSet.has(o.id));
  const selected = selectedIds
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is UserPickerOption => o != null);

  function add(id: number) {
    if (disabled || selectedSet.has(id)) return;
    onChange([...selectedIds, id]);
  }

  function remove(id: number) {
    if (disabled) return;
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", invalid && "rounded-lg ring-1 ring-red-400")}>
      <PickerColumn
        title={availableTitle}
        empty={emptyAvailable}
        items={available}
        action="add"
        disabled={disabled}
        onAction={add}
      />
      <PickerColumn
        title={selectedTitle}
        empty={emptySelected}
        items={selected}
        action="remove"
        disabled={disabled}
        onAction={remove}
      />
    </div>
  );
}

function PickerColumn({
  title,
  empty,
  items,
  action,
  disabled,
  onAction,
}: {
  title: string;
  empty: string;
  items: UserPickerOption[];
  action: "add" | "remove";
  disabled?: boolean;
  onAction: (id: number) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700">
      <p className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
        {title}
        <span className="ml-1 font-normal text-slate-400">({items.length})</span>
      </p>
      <div className="max-h-56 space-y-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-slate-400">{empty}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-100 px-2 py-1.5 dark:border-slate-800"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</p>
                {item.subtitle ? (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={disabled}
                aria-label={action === "add" ? `Add ${item.label}` : `Remove ${item.label}`}
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
                  action === "add"
                    ? "text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
                    : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40",
                  disabled && "pointer-events-none opacity-50",
                )}
                onClick={() => onAction(item.id)}
              >
                {action === "add" ? <Plus className="size-3.5" /> : <Minus className="size-3.5" />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
