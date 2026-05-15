"use client";

import React, { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Country, State, City } from "country-state-city";
import { FormPhoneInput } from "./phone-input";

interface SubformField {
  name: string;
  label: string;
  type: string;
  order?: number;
  is_deleted?: boolean;
  required?: boolean | string;
  options?: any[];
  placeholder?: string;
  lookup_module?: string;
  module?: string;
  relatedObject?: string;
  search_for?: string;
  multi?: boolean;
  userType?: "single" | "multiple";
}

interface SubFormProps {
  label: React.ReactNode;
  fields: SubformField[];
  value: any[];
  onChange: (value: any[]) => void;
  required?: boolean;
  readOnly?: boolean;
}

const getNormalizedType = (type: string) => {
  if (!type) return "text";
  const aliases: Record<string, string> = {
    pick_list: "pick-list",
    multi_line: "textarea",
    "multi-line": "textarea",
    multi_select: "multi-select",
    date_time: "date-time",
    auto_number: "text",
    rollup_summary: "text",
    long_integer: "number",
    multi_select_lookup: "multi-select-lookup",
    file_upload: "file",
    image_upload: "image_uploader",
  };
  return aliases[type] || type;
};

const buildEmptyRow = (fields: SubformField[] = []) =>
  fields.reduce((acc: any, f) => {
    if (!f?.name) return acc;
    const norm = getNormalizedType(f.type);
    acc[f.name] =
      norm === "multi-select" || norm === "multi-select-lookup" ? [] : "";
    return acc;
  }, {});

const CELL_CLASS =
  "w-full h-9 px-2 text-sm text-gray-700 bg-transparent outline-none border-none focus:ring-0";

const CellInput: React.FC<{
  field: SubformField;
  value: any;
  onChange: (val: any) => void;
  rowData: any;
}> = ({ field, value, onChange, rowData = {} }) => {
  const norm = getNormalizedType(field.type);

  // For now, we'll implement a simplified version of lookup/user components
  // until they are fully ported to onetrace_frontend.
  if (["lookup", "multi-select-lookup", "multi_select_lookup", "user", "receiver-lookup", "receiver_lookup"].includes(norm)) {
    return (
      <div className="px-2 py-1 min-w-[160px] text-gray-400 text-xs italic">
        {norm} component not yet available
      </div>
    );
  }

  if (norm === "phone" || norm === "mobile") {
    // In a subform table, we might want a simpler phone input than the full SurfacePhoneField
    return (
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || "Phone"}
        className={CELL_CLASS}
      />
    );
  }

  if (norm === "country") {
    const countries = Country.getAllCountries();
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={CELL_CLASS}
      >
        <option value="">Select Country</option>
        {countries.map((c) => (
          <option key={c.isoCode} value={c.isoCode}>
            {c.name}
          </option>
        ))}
      </select>
    );
  }

  if (norm === "state") {
    const countryCode = rowData?.country || "";
    const states = countryCode ? State.getStatesOfCountry(countryCode) : [];
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={!countryCode}
        className={`${CELL_CLASS} disabled:bg-gray-50 disabled:cursor-not-allowed`}
      >
        <option value="">{countryCode ? "Select State" : "Select Country first"}</option>
        {states.map((s) => (
          <option key={s.isoCode} value={s.isoCode}>
            {s.name}
          </option>
        ))}
      </select>
    );
  }

  if (norm === "city") {
    const countryCode = rowData?.country || "";
    const stateCode = rowData?.state || "";
    const cities =
      countryCode && stateCode ? City.getCitiesOfState(countryCode, stateCode) : [];
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={!countryCode || !stateCode}
        className={`${CELL_CLASS} disabled:bg-gray-50 disabled:cursor-not-allowed`}
      >
        <option value="">
          {!countryCode
            ? "Select Country first"
            : !stateCode
              ? "Select State first"
              : "Select City"}
        </option>
        {cities.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    );
  }

  if (norm === "pick-list" || norm === "select") {
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={CELL_CLASS}
      >
        <option value="">Select…</option>
        {(field.options || []).map((opt: any, i: number) => (
          <option key={i} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    );
  }

  if (norm === "checkbox") {
    return (
      <div className="flex items-center justify-center h-9">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
        />
      </div>
    );
  }

  if (norm === "textarea") {
    return (
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        placeholder={field.placeholder || ""}
        className="w-full px-2 py-1.5 text-sm text-gray-700 bg-transparent outline-none resize-none border-none focus:ring-0"
      />
    );
  }

  const inputTypeMap: Record<string, string> = {
    date: "date",
    "date-time": "datetime-local",
    date_time: "datetime-local",
    time: "time",
    number: "number",
    long_integer: "number",
    email: "email",
    url: "url",
  };

  const inputType = inputTypeMap[norm] || "text";

  return (
    <input
      type={inputType}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder || ""}
      className={CELL_CLASS}
    />
  );
};

const SubForm: React.FC<SubFormProps> = ({
  label,
  fields = [],
  value,
  onChange,
  required = false,
  readOnly = false,
}) => {
  const activeFields = [...fields]
    .filter((f) => f?.name && !f.is_deleted)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const [internalRows, setInternalRows] = useState(() =>
    Array.isArray(value) && value.length > 0
      ? value
      : [buildEmptyRow(activeFields)]
  );

  const rows = Array.isArray(value) ? value : internalRows;

  const setRows = useCallback(
    (next: any) => {
      const updated = typeof next === "function" ? next(rows) : next;
      setInternalRows(updated);
      onChange?.(updated);
    },
    [rows, onChange]
  );

  const handleAddRow = () => setRows((prev: any[]) => [...prev, buildEmptyRow(activeFields)]);
  const handleRemoveRow = (idx: number) => setRows((prev: any[]) => prev.filter((_, i) => i !== idx));
  const handleCellChange = useCallback(
    (rowIdx: number, fieldName: string, val: any) => {
      setRows((prev: any[]) =>
        prev.map((r, i) => (i === rowIdx ? { ...r, [fieldName]: val } : r))
      );
    },
    [setRows]
  );

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[13px] font-bold text-gray-600 uppercase tracking-wide">
            {label}
          </span>
          {required && <span className="text-red-500 font-bold">*</span>}
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/80">
              {activeFields.map((f) => (
                <th
                  key={f.name}
                  className="px-4 py-3 text-left text-[12px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap"
                >
                  <span>{f.label}</span>
                  {(f.required === true || f.required === "true") && (
                    <span className="text-red-400 ml-0.5">*</span>
                  )}
                </th>
              ))}
              {!readOnly && rows.length > 1 && (
                <th className="w-10 border-b border-gray-200 bg-gray-50/80" />
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((rowData, rowIdx) => (
              <tr
                key={rowIdx}
                className="group border-b border-gray-100 last:border-none hover:bg-blue-50/30 transition-colors"
              >
                {activeFields.map((f) => (
                  <td
                    key={f.name}
                    className="border-r border-gray-100 last:border-none align-middle"
                  >
                    <CellInput
                      field={f}
                      value={rowData[f.name] ?? ""}
                      onChange={(val) => handleCellChange(rowIdx, f.name, val)}
                      rowData={rowData}
                    />
                  </td>
                ))}

                {!readOnly && rows.length > 1 && (
                  <td className="w-10 align-middle text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(rowIdx)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
                      title="Delete row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={handleAddRow}
          className="mt-3 flex items-center bg-blue-600 gap-1.5 px-4 py-2 text-sm font-semibold text-white border border-transparent rounded-lg hover:bg-blue-700 transition-all duration-200 active:scale-95"
        >
          <Plus size={15} />
          Add row
        </button>
      )}
    </div>
  );
};

export default SubForm;
