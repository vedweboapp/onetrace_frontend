"use client";

import * as React from "react";
import { cn } from "@/core/utils/http.util";
import { InputWithEndSelect, type InputWithEndSelectOption } from "@/shared/ui/input-with-end-select";

export const DIMENSION_UNIT_OPTIONS: InputWithEndSelectOption[] = [
  { value: "cm", label: "cm" },
  { value: "mm", label: "mm" },
  { value: "m", label: "m" },
  { value: "in", label: "in" },
  { value: "ft", label: "ft" },
];

function sanitizeDimensionSegment(segment: string): string {
  const cleaned = segment.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

type Axis = "length" | "width" | "height";

type Props = {
  id: string;
  length: string;
  width: string;
  height: string;
  onChange: (next: { length: string; width: string; height: string }) => void;
  unit: string;
  onUnitChange: (unit: string) => void;
  unitAriaLabel: string;
  lengthAriaLabel: string;
  widthAriaLabel: string;
  heightAriaLabel: string;
  disabled?: boolean;
  className?: string;
};

const segmentClassName = cn(
  "h-full min-w-0 flex-1 border-0 bg-transparent px-1 text-center text-sm text-slate-900 outline-none",
  "placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500",
  "disabled:cursor-not-allowed disabled:text-slate-400",
);

function applySegmentInput(
  raw: string,
  current: string,
): { value: string; jumpNext: boolean } {
  if (/[xX*×/\s]$/.test(raw) && raw.length > current.length) {
    return { value: sanitizeDimensionSegment(raw.slice(0, -1)), jumpNext: true };
  }
  return { value: sanitizeDimensionSegment(raw), jumpNext: false };
}

export function DimensionsLwhInput({
  id,
  length,
  width,
  height,
  onChange,
  unit,
  onUnitChange,
  unitAriaLabel,
  lengthAriaLabel,
  widthAriaLabel,
  heightAriaLabel,
  disabled = false,
  className,
}: Props) {
  const lengthRef = React.useRef<HTMLInputElement>(null);
  const widthRef = React.useRef<HTMLInputElement>(null);
  const heightRef = React.useRef<HTMLInputElement>(null);

  function setAxis(axis: Axis, raw: string) {
    const current = axis === "length" ? length : axis === "width" ? width : height;
    const { value, jumpNext } = applySegmentInput(raw, current);
    const next = { length, width, height, [axis]: value };
    onChange(next);
    if (!jumpNext) return;
    if (axis === "length") widthRef.current?.focus();
    if (axis === "width") heightRef.current?.focus();
  }

  function onKeyDown(axis: Axis, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Backspace") return;
    const el = e.currentTarget;
    if (el.value !== "" || el.selectionStart !== 0) return;
    e.preventDefault();
    if (axis === "width") lengthRef.current?.focus();
    if (axis === "height") widthRef.current?.focus();
  }

  return (
    <InputWithEndSelect
      className={className}
      disabled={disabled}
      selectValue={unit}
      onSelectChange={onUnitChange}
      selectOptions={DIMENSION_UNIT_OPTIONS}
      selectAriaLabel={unitAriaLabel}
      startSlot={
        <div className="flex min-w-0 flex-1 items-center px-2">
          <input
            ref={lengthRef}
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label={lengthAriaLabel}
            value={length}
            disabled={disabled}
            onChange={(e) => setAxis("length", e.target.value)}
            onKeyDown={(e) => onKeyDown("length", e)}
            className={segmentClassName}
          />
          <span className="shrink-0 px-0.5 text-sm text-slate-400 dark:text-slate-500" aria-hidden>
            x
          </span>
          <input
            ref={widthRef}
            id={`${id}-width`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label={widthAriaLabel}
            value={width}
            disabled={disabled}
            onChange={(e) => setAxis("width", e.target.value)}
            onKeyDown={(e) => onKeyDown("width", e)}
            className={segmentClassName}
          />
          <span className="shrink-0 px-0.5 text-sm text-slate-400 dark:text-slate-500" aria-hidden>
            x
          </span>
          <input
            ref={heightRef}
            id={`${id}-height`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label={heightAriaLabel}
            value={height}
            disabled={disabled}
            onChange={(e) => setAxis("height", e.target.value)}
            onKeyDown={(e) => onKeyDown("height", e)}
            className={segmentClassName}
          />
        </div>
      }
    />
  );
}
