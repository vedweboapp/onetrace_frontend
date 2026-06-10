"use client";

import React from "react";
import { FieldError } from "react-hook-form";

interface FormCheckboxProps {
  label?: React.ReactNode;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onBlur?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  errors?: FieldError;
  readOnly?: boolean;
  className?: string;
}

const FormCheckbox: React.FC<FormCheckboxProps> = ({
  label,
  name,
  checked,
  onChange,
  onBlur,
  inputRef,
  errors,
  readOnly = false,
  className = "",
}) => {
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      <label
        htmlFor={name}
        className={`flex items-center gap-3 ${
          readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        <input
          id={name}
          name={name}
          ref={inputRef}
          type="checkbox"
          checked={checked}
          disabled={readOnly}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 accent-primary rounded border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-primary disabled:cursor-not-allowed"
        />
        {label && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
        )}
      </label>
      {errors && (
        <span className="text-red-500 text-xs mt-0.5">{errors.message}</span>
      )}
    </div>
  );
};

export default FormCheckbox;
