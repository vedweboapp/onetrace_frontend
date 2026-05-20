"use client";

import React from "react";
import { UseFormRegisterReturn, FieldError } from "react-hook-form";

interface RadioOption {
  label: string;
  value: string | number;
}

interface RadioGroupProps {
  label?: string;
  name: string;
  options: (string | RadioOption)[];
  register: UseFormRegisterReturn;
  errors?: FieldError;
  readOnly?: boolean;
  className?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  name,
  options = [],
  register,
  errors,
  readOnly = false,
  className = "",
}) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <div className="flex flex-wrap gap-4 mt-1">
        {options.map((opt, index) => {
          const optLabel = typeof opt === "string" ? opt : opt.label;
          const optValue = typeof opt === "string" ? opt : opt.value;
          const id = `${name}-${index}`;

          return (
            <label
              key={index}
              htmlFor={id}
              className={`
                flex items-center gap-2 cursor-pointer group
                ${readOnly ? "opacity-60 cursor-not-allowed" : ""}
              `}
            >
              <div className="relative flex items-center justify-center">
                <input
                  id={id}
                  type="radio"
                  value={optValue}
                  disabled={readOnly}
                  {...register}
                  className="
                    peer appearance-none w-5 h-5 border-2 border-gray-300 dark:border-slate-600 rounded-full
                    checked:border-blue-500 checked:bg-blue-500 transition-all focus:ring-2 focus:ring-blue-500/20
                  "
                />
                <div className="absolute w-2 h-2 bg-white rounded-full scale-0 peer-checked:scale-100 transition-transform" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {optLabel}
              </span>
            </label>
          );
        })}
      </div>

      {errors && <span className="text-red-500 text-xs mt-1">{errors.message}</span>}
    </div>
  );
};

export default RadioGroup;
