"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, ChevronDown, Search, CircleSlash } from "lucide-react";
import { FieldError } from "react-hook-form";

export interface Option {
  label: string;
  value: string | number;
}

export interface MultiSelectProps {
  label?: string | React.ReactNode;
  name: string;
  options: (string | Option)[];
  value?: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  errors?: FieldError;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      label,
      name,
      options = [],
      value = [],
      onChange,
      errors,
      placeholder = "Select options...",
      readOnly = false,
      className = "",
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Normalize option array to Option objects
    const normalizedOptions = useMemo((): Option[] => {
      return options.map((opt) =>
        typeof opt === "string" ? { label: opt, value: opt } : opt
      );
    }, [options]);

    // Handle click outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchInputRef.current) {
        searchInputRef.current.focus();
      } else if (!isOpen) {
        setSearchQuery("");
      }
    }, [isOpen]);

    const toggleOption = (optValue: string | number) => {
      if (readOnly) return;
      const safeValue = Array.isArray(value) ? value : [];
      const newValue = safeValue.includes(optValue)
        ? safeValue.filter((v) => v !== optValue)
        : [...safeValue, optValue];
      onChange(newValue);
    };

    const removeOption = (e: React.MouseEvent, optValue: string | number) => {
      e.stopPropagation();
      if (readOnly) return;
      const safeValue = Array.isArray(value) ? value : [];
      onChange(safeValue.filter((v) => v !== optValue));
    };

    const selectedOptions = useMemo(() => {
      const safeValue = Array.isArray(value) ? value : [];
      return normalizedOptions.filter((opt) => safeValue.includes(opt.value));
    }, [normalizedOptions, value]);

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
      if (!searchQuery.trim()) return normalizedOptions;
      const query = searchQuery.toLowerCase();
      return normalizedOptions.filter((opt) =>
        opt.label.toLowerCase().includes(query)
      );
    }, [normalizedOptions, searchQuery]);

    // Select all / clear actions
    const handleSelectAll = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (readOnly) return;
      const allValues = filteredOptions.map((opt) => opt.value);
      const safeValue = Array.isArray(value) ? value : [];
      const combined = Array.from(new Set([...safeValue, ...allValues]));
      onChange(combined);
    };

    const handleClearAll = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (readOnly) return;
      const filteredValues = filteredOptions.map((opt) => opt.value);
      const safeValue = Array.isArray(value) ? value : [];
      onChange(safeValue.filter((v) => !filteredValues.includes(v)));
    };

    return (
      <div
        className={`flex flex-col gap-1.5 w-full ${className}`}
        ref={(node) => {
          containerRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
      >
        {label && (
          <div className="flex items-center justify-between">
            {typeof label === "string" ? (
              <label className="text-[13px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                {label}
              </label>
            ) : (
              label
            )}
          </div>
        )}

        <div className="relative">
          <div
            onClick={() => !readOnly && setIsOpen(!isOpen)}
            className={`
              min-h-[42px] w-full rounded-[8px] border px-3 py-1.5 flex flex-wrap gap-1.5 items-center cursor-pointer transition-all duration-200 select-none
              ${readOnly ? "bg-gray-100 dark:bg-slate-800/50 cursor-not-allowed border-none text-gray-500" : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"}
              ${errors ? "border-red-500 focus:ring-1 focus:ring-red-500" : "hover:border-gray-300 dark:hover:border-slate-600"}
              ${isOpen ? "ring-2 ring-blue-500/20 border-blue-500" : ""}
            `}
          >
            {selectedOptions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 flex-1 pr-6">
                {selectedOptions.map((opt) => (
                  <span
                    key={opt.value}
                    className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 bg-blue-50/70 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-[4px] border border-blue-100 dark:border-blue-800/50"
                  >
                    {opt.label}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => removeOption(e, opt.value)}
                        className="hover:bg-blue-100 dark:hover:bg-blue-800 p-0.5 rounded-full text-blue-500 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 dark:text-gray-500 text-sm flex-1">{placeholder}</span>
            )}

            <div className="text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-500" : ""}`}
              />
            </div>
          </div>

          {isOpen && !readOnly && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Option Search Header */}
              <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center gap-2">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 outline-none p-0.5"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="px-3 py-1.5 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold text-gray-400 tracking-wider bg-gray-50/20">
                <span>OPTIONS ({filteredOptions.length})</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    SELECT ALL
                  </button>
                  <span className="text-gray-200 dark:text-gray-800">|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-gray-500 hover:text-gray-600"
                  >
                    CLEAR ALL
                  </button>
                </div>
              </div>

              {/* Options List */}
              <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const isSelected = Array.isArray(value) && value.includes(opt.value);
                    return (
                      <div
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => toggleOption(opt.value)}
                        className={`
                          px-3 py-2 text-sm cursor-pointer rounded-[4px] transition-all duration-150 select-none truncate
                          ${
                            isSelected
                              ? "bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                              : "hover:bg-gray-50 dark:hover:bg-slate-800/80 text-gray-700 dark:text-gray-300"
                          }
                        `}
                      >
                        {opt.label}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-1.5">
                    <CircleSlash size={16} />
                    <span className="text-xs italic">No matching options</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {errors && (
          <span className="text-red-500 text-xs mt-0.5 ml-0.5">
            {errors.message}
          </span>
        )}
      </div>
    );
  }
);

MultiSelect.displayName = "MultiSelect";

export default MultiSelect;
