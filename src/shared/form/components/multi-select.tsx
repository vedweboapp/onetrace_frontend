"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Check } from "lucide-react";
import { FieldError } from "react-hook-form";

interface Option {
  label: string;
  value: string | number;
}

interface MultiSelectProps {
  label?: string;
  name: string;
  options: (string | Option)[];
  value?: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  errors?: FieldError;
  placeholder?: string;
  readOnly?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  name,
  options = [],
  value = [],
  onChange,
  errors,
  placeholder = "Select options...",
  readOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: Option[] = options.map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (optValue: string | number) => {
    if (readOnly) return;
    const newValue = value.includes(optValue)
      ? value.filter((v) => v !== optValue)
      : [...value, optValue];
    onChange(newValue);
  };

  const removeOption = (e: React.MouseEvent, optValue: string | number) => {
    e.stopPropagation();
    if (readOnly) return;
    onChange(value.filter((v) => v !== optValue));
  };

  const selectedOptions = normalizedOptions.filter((opt) => value.includes(opt.value));

  return (
    <div className="flex flex-col gap-1 w-full" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="relative">
        <div
          onClick={() => !readOnly && setIsOpen(!isOpen)}
          className={`
            min-h-[42px] w-full rounded-[8px] border px-3 py-1.5 flex flex-wrap gap-2 items-center cursor-pointer transition-all
            ${readOnly ? "bg-gray-100 cursor-not-allowed border-none" : "bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"}
            ${errors ? "border-red-500" : "hover:border-gray-400"}
            ${isOpen ? "ring-2 ring-blue-500 border-blue-500" : ""}
          `}
        >
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded border border-blue-200 dark:border-blue-800"
              >
                {opt.label}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => removeOption(e, opt.value)}
                    className="hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}

          <div className="ml-auto pl-2 text-gray-400">
            <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </div>

        {isOpen && !readOnly && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
            {normalizedOptions.length > 0 ? (
              normalizedOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className={`
                    px-4 py-2 text-sm flex items-center justify-between cursor-pointer transition-colors
                    ${value.includes(opt.value) ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300"}
                  `}
                >
                  {opt.label}
                  {value.includes(opt.value) && <Check size={16} />}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center italic">
                No options available
              </div>
            )}
          </div>
        )}
      </div>

      {errors && <span className="text-red-500 text-xs mt-1">{errors.message}</span>}
    </div>
  );
};

export default MultiSelect;
