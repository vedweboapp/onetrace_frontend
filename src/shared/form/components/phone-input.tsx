"use client";

import React from "react";
import { Control, FieldErrors, RegisterOptions } from "react-hook-form";
import { SurfacePhoneField } from "@/shared/ui/surface-phone-field";

interface FormPhoneInputProps {
    className?: string;
    feildName?: React.ReactNode; // Maintain the typo for compatibility with FormRenderer
    name?: string;
    control: Control<any>;
    errors?: FieldErrors<any>;
    rules?: RegisterOptions;
    readOnly?: boolean;
    placeholder?: string;
}

export const FormPhoneInput: React.FC<FormPhoneInputProps> = ({
    className,
    feildName = "Phone number",
    name = "phone",
    control,
    errors,
    rules,
    readOnly,
    placeholder,
}) => {
    const error = errors?.[name]?.message as string | undefined;

    return (
        <SurfacePhoneField
            id={name}
            name={name}
            control={control}
            label={feildName}
            disabled={readOnly}
            error={error}
            placeholder={placeholder}
            className={className}
            rules={rules}
        />
    );
};

