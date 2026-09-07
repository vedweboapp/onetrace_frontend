"use client";

import React from "react";
import { UseFormRegisterReturn, FieldError } from "react-hook-form";
import { FieldErrorText, FieldGroup } from "@/shared/ui";

interface RadioOption {
  label: string;
  value: string | number;
}

interface RadioGroupProps {
  label?: React.ReactNode;
  name: string;
  options: (string | RadioOption)[];
  register: UseFormRegisterReturn;
  defaultValue?: any;
  errors?: FieldError;
  readOnly?: boolean;
  className?: string;
  fieldRequired?: boolean;
  required?: boolean;
}

const cleanLabelNode = (label?: React.ReactNode): React.ReactNode => {
  if (!label) return "";
  if (typeof label === "string") return label.replace(/[*:]/g, "").trim();
  return label;
};

const labelLooksRequired = (label?: React.ReactNode) =>
  typeof label === "string" && /\*/.test(label);

const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  name,
  options = [],
  register,
  defaultValue,
  errors,
  readOnly = false,
  className = "",
  fieldRequired,
  required,
}) => {
  const isRequired = Boolean(fieldRequired ?? required ?? labelLooksRequired(label));
  const displayLabel = cleanLabelNode(label);

  const control = (
    <div className="flex flex-wrap gap-4 items-center min-h-[var(--form-control-height,2.5rem)]">
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
                defaultChecked={
                  defaultValue !== undefined &&
                  defaultValue !== null &&
                  String(optValue) === String(defaultValue)
                }
                {...register}
                className="
                  peer appearance-none w-5 h-5 border-2 border-gray-300 dark:border-slate-600 rounded-full
                  checked:border-[color:var(--dash-accent)] checked:bg-[color:var(--dash-accent)] transition-all focus:ring-2 focus:ring-blue-500/20
                "
              />
              <div className="absolute w-2 h-2 bg-white rounded-full scale-0 peer-checked:scale-100 transition-transform" />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
              {optLabel}
            </span>
          </label>
        );
      })}
    </div>
  );

  if (!label) {
    return (
      <div className={`w-full ${className}`}>
        {control}
        <FieldErrorText>{errors?.message}</FieldErrorText>
      </div>
    );
  }

  return (
    <FieldGroup label={displayLabel} required={isRequired} className={`w-full ${className}`}>
      {control}
      <FieldErrorText>{errors?.message}</FieldErrorText>
    </FieldGroup>
  );
};

export default RadioGroup;
