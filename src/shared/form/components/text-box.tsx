"use client";

import React from "react";
import {
  FieldErrorText,
  FieldGroup,
  surfaceTextareaClassName,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

interface TextBoxProps {
  label?: React.ReactNode;
  register?: any;
  errors?: any;
  readOnly?: boolean;
  className?: string;
  rows?: number;
  fieldRequired?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  [key: string]: any;
}

const cleanLabelNode = (label?: React.ReactNode): React.ReactNode => {
  if (!label) return "";
  if (typeof label === "string") return label.replace(/[*:]/g, "").trim();
  return label;
};

const TextBox: React.FC<TextBoxProps> = ({
  label,
  register,
  errors,
  readOnly,
  className = "",
  rows = 4,
  fieldRequired,
  required,
  id,
  name,
  ...rest
}) => {
  const inputId = id ?? register?.name ?? name;
  const cleanLabel = cleanLabelNode(label);
  const isRequired = Boolean(
    fieldRequired ?? required ?? (typeof label === "string" && /\*/.test(label)),
  );

  const control = (
    <textarea
      id={inputId}
      name={name}
      {...register}
      {...rest}
      required={required}
      rows={rows}
      readOnly={readOnly}
      placeholder={
        rest.placeholder ||
        (typeof cleanLabel === "string" && cleanLabel ? `Enter ${cleanLabel} here` : rest.placeholder)
      }
      aria-invalid={errors ? true : undefined}
      className={cn(
        surfaceTextareaClassName,
        "field-control",
        readOnly &&
          "pointer-events-none cursor-default border-slate-200 bg-slate-50 select-none focus-visible:border-slate-200 focus-visible:ring-0 dark:border-slate-700 dark:bg-slate-800/50",
        errors && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
        className,
      )}
    />
  );

  if (!label) {
    return (
      <div className="w-full min-w-0">
        {control}
        <FieldErrorText>{errors?.message}</FieldErrorText>
      </div>
    );
  }

  return (
    <FieldGroup label={cleanLabel} htmlFor={inputId} required={isRequired} className="w-full">
      {control}
      <FieldErrorText>{errors?.message}</FieldErrorText>
    </FieldGroup>
  );
};

export default TextBox;
