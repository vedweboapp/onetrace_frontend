"use client";

import React from "react";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { currencyList } from "./currency-list";

interface CurrencySelectProps {
  label?: string;
  register?: UseFormRegisterReturn;
  errors?: FieldError;
  readOnly?: boolean;
  className?: string;
  defaultValue?: string;
  name?: string;
}

const CurrencySelect: React.FC<CurrencySelectProps> = ({
  label,
  register,
  errors,
  readOnly,
  className = "",
  ...rest
}) => {
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label
          htmlFor={rest.name}
          className="text-sm font-medium text-mutedtext"
        >
          {label}
        </label>
      )}

      <select
        {...register}
        {...rest}
        disabled={readOnly}
        className={`
          rounded-[8px]
          px-3
          py-2
          outline-none
          w-full
          ${readOnly
            ? `border-none bg-gray-100 cursor-not-allowed select-none`
            : `bg-white border ${errors ? "border-red-500" : "border-gray-300"} focus:ring-2 focus:ring-blue-500`
          }
        `}
      >
        <option value="">Select Currency</option>
        {currencyList.map((currency) => (
          <option key={`${currency.countryCode}-${currency.value}`} value={currency.value}>
            {currency.label} ({currency.symbol})
          </option>
        ))}
      </select>

      {errors && (
        <span className="text-red-500 text-xs">
          {errors.message}
        </span>
      )}
    </div>
  );
};

export default CurrencySelect;
