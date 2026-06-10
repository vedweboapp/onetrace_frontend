"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
} from "react";
import { useForm, Controller } from "react-hook-form";
import Input from "../components/input";
import Select from "../components/select";
import TextBox from "../components/text-box";
import { FormPhoneInput } from "../components/phone-input";
import SubForm from "../components/Subform";
import CurrencySelect from "../components/CurrencySelect";
import FileUploader from "../components/file-uploader";
import MultiSelect from "../components/multi-select";
import RadioGroup from "../components/radio-group";
import FormCheckbox from "../components/form-checkbox";
import SignaturePad from "../components/signature-pad";
import UsersSelect from "../components/users-select";
import ProfilePictureUploader from "../../components/profile-picture-uploader";
import { Country } from "country-state-city";
import CountrySelect from "../components/CountrySelect";
import StateSelect from "../components/StateSelect";
import CitySelect from "../components/CitySelect";
import RichTextEditor from "../components/rich-text-editor";
import { FormRule } from "./form-rules.types";
import { buildFieldRuleState, FieldRuleState } from "./form-rules-engine";

interface Field {
  api_name: string;
  field_label: string;
  field_type: string;
  order?: number;
  required?: boolean | string;
  placeholder?: string;
  options?: any[];
  readOnly?: boolean;
  colspan?: number;
  parent_field?: string;
  [key: string]: any;
}

interface Section {
  name?: string;
  column_count?: number;
  is_subform?: boolean;
  subform_field_name?: string;
  sequence?: number;
  fields: Field[];
}

interface FormRendererProps {
  schema: Section[];
  defaultValues?: any;
  autoPopulateData?: any;
  onFieldChange?: (name: string, value: any) => void;
  rules?: FormRule[];
  renderMode?: "desktop" | "phone";
}

export interface FormRendererRef {
  getFormData: () => any;
  getChangedData: () => any;
  reset: (values?: any) => void;
  submit: (onSuccess: (data: any) => void, onError?: (errors: any) => void) => void;
  watch: any;
  setValue: (name: string, value: any) => void;
}

const FIELD_COMPONENTS: Record<string, any> = {
  single_line: Input,
  number: (props: any) => <Input type="number" {...props} />,
  url: (props: any) => <Input type="url" {...props} />,
  email: (props: any) => <Input type="email" {...props} />,
  date: (props: any) => <Input type="date" {...props} />,
  datetime: (props: any) => <Input type="datetime-local" {...props} />,
  multi_line: TextBox,
  picklist: Select,
  select: Select,
  radio: RadioGroup,
  checkbox: FormCheckbox,
  phone: FormPhoneInput,
  currency: CurrencySelect,
  file_upload: FileUploader,
  image_upload: (props: any) => (
    <div className="flex flex-col gap-2">
      {props.label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{props.label}</span>}
      <ProfilePictureUploader 
        image={props.value} 
        setImage={(val: any) => props.onChange(val)} 
        readOnly={props.readOnly}
      />
    </div>
  ),
  multi_select: MultiSelect,
  signature: SignaturePad,
  user: UsersSelect,
  country: CountrySelect,
  state: Input,
  city: Input,
};

const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object") {
    const ka = Object.keys(a),
      kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
};

const FIELD_TYPE_ALIASES: Record<string, string> = {
  radio_button: "radio",
  radio_group: "radio",
  "radio-group": "radio",
};

const getNormalizedType = (type: string) => {
  const t = type || "single_line";
  return FIELD_TYPE_ALIASES[t] || t;
};

const getCountryISO = (name: string) => {
  if (!name || typeof name !== "string") return name;
  if (name.length === 2 && /^[A-Z]{2}$/.test(name)) return name;
  const match = Country.getAllCountries().find(
    (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim(),
  );
  return match ? match.isoCode : name;
};

const getRichTextPlainText = (html: string | undefined | null): string => {
  if (!html || typeof html !== "string") return "";
  if (typeof document === "undefined") {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || el.innerText || "").replace(/\s+/g, " ").trim();
};

const isRichTextEmpty = (html: string | undefined | null) =>
  getRichTextPlainText(html).length === 0;

const getEditorType = (field: Field) =>
  field.editor_type ??
  (field as { editorType?: string }).editorType ??
  field.properties?.validation_rules?.editor_type;

const buildRichTextValidations = (validations: Record<string, any>, field: Field) => {
  const rules = { ...validations };
  let requiredMessage: string | null = null;

  if (rules.required) {
    requiredMessage =
      typeof rules.required === "string"
        ? rules.required
        : `${field.field_label || "This field"} is required`;
    delete rules.required;
  }

  const maxRule = rules.maxLength;
  const minRule = rules.minLength;
  if (maxRule) delete rules.maxLength;
  if (minRule) delete rules.minLength;

  const prevValidate = rules.validate;

  rules.validate = (value: string) => {
    if (requiredMessage && isRichTextEmpty(value)) {
      return requiredMessage;
    }

    const plainLen = getRichTextPlainText(value).length;
    if (minRule && plainLen < minRule.value) {
      return minRule.message;
    }
    if (maxRule && plainLen > maxRule.value) {
      return maxRule.message;
    }

    if (typeof prevValidate === "function") {
      const result = prevValidate(value);
      if (result !== true) return result;
    }

    return true;
  };

  return rules;
};

const FormField: React.FC<{
  field: Field;
  control: any;
  register: any;
  watch: any;
  setValue: any;
  getError: (name: string) => any;
  errors: any;
  isSubmitted: boolean;
  dirtyFields: any;
  sectionFields?: Field[];
  ruleState?: FieldRuleState;
  forceSingleColumn?: boolean;
}> = ({
  field,
  control,
  register,
  watch,
  setValue,
  getError,
  errors,
  isSubmitted,
  dirtyFields,
  sectionFields = [],
  ruleState,
  forceSingleColumn = false,
}) => {
  if (!field || !field.api_name) return null;

  if (ruleState && ruleState.visible === false) return null;

  const normType = getNormalizedType(field.field_type);
  const Component = FIELD_COMPONENTS[normType] || Input;

  let extraProps: any = {};
  if (normType === "state") {
    const countryField = sectionFields?.find((f) => getNormalizedType(f.field_type) === "country");
    const countryFieldName = countryField?.api_name || "country";
    extraProps.countryCode = watch(countryFieldName);
  } else if (normType === "city") {
    const countryField = sectionFields?.find((f) => getNormalizedType(f.field_type) === "country");
    const countryFieldName = countryField?.api_name || "country";
    extraProps.countryCode = watch(countryFieldName);

    const stateField = sectionFields?.find((f) => getNormalizedType(f.field_type) === "state");
    const stateFieldName = stateField?.api_name || "state";
    extraProps.stateCode = watch(stateFieldName);
  }

  const validations: any = { ...field.validations };
  if (field.required === true || field.required === "true") {
    if (!validations.required) {
      validations.required = `${field.field_label || "This field"} is required`;
    }
  }
  if (field.maxLength !== undefined && field.maxLength !== null && field.maxLength !== "") {
    const maxVal = Number(field.maxLength);
    if (!isNaN(maxVal) && maxVal > 0) {
      validations.maxLength = {
        value: maxVal,
        message: `${field.field_label || "This field"} cannot exceed ${maxVal} characters`,
      };
    }
  }
  if (field.minLength !== undefined && field.minLength !== null && field.minLength !== "") {
    const minVal = Number(field.minLength);
    if (!isNaN(minVal) && minVal > 0) {
      validations.minLength = {
        value: minVal,
        message: `${field.field_label || "This field"} must be at least ${minVal} characters`,
      };
    }
  }
  if (normType === "number") {
    const maxDigitsRaw = field.max;
    if (maxDigitsRaw !== undefined && maxDigitsRaw !== null && maxDigitsRaw !== "") {
      const maxDigits = Number(maxDigitsRaw);
      if (!isNaN(maxDigits) && maxDigits > 0) {
        const digitMessage = `${field.field_label || "This field"} cannot exceed ${maxDigits} digit${maxDigits === 1 ? "" : "s"}`;
        const prevValidate = validations.validate;
        validations.validate = (value: string | number) => {
          if (value === undefined || value === null || value === "") return true;
          const digitCount = String(value).replace(/\D/g, "").length;
          if (digitCount > maxDigits) return digitMessage;
          if (typeof prevValidate === "function") {
            const result = prevValidate(value);
            if (result !== true) return result;
          }
          return true;
        };
      }
    }
  }

  if (ruleState?.required) {
    validations.required = `${field.field_label || "This field"} is required (by rule)`;
  }

  const isRequired = !!validations.required;

  const isDisabled = !!ruleState?.disabled;
  const isReadOnly = field.readOnly || isDisabled;

  const label = (
    <div className="flex items-center gap-1 mb-1">
      <span className="text-[13px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
        {field.field_label}
      </span>
      {isRequired && (
        <span className="text-red-500 font-bold text-sm ml-0.5">*</span>
      )}
    </div>
  );

  const colSpan = field.colspan || 1;
  const colSpanClass = forceSingleColumn
    ? ""
    : colSpan === 2
      ? "md:col-span-2"
      : colSpan === 3
        ? "md:col-span-3"
        : "md:col-span-1";

  if (normType === "phone" || normType === "mobile") {
    return (
      <div className={colSpanClass}>
        <FormPhoneInput
          feildName={label}
          name={field.api_name}
          control={control}
          errors={errors}
          rules={validations}
          readOnly={isReadOnly}
          placeholder={field.placeholder}
        />
      </div>
    );
  }

  if (normType === "checkbox") {
    const checkboxValidations = { ...validations };
    if (checkboxValidations.required) {
      const requiredMessage =
        typeof checkboxValidations.required === "string"
          ? checkboxValidations.required
          : `${field.field_label || "This field"} is required`;
      checkboxValidations.validate = (value: boolean) =>
        value === true || requiredMessage;
      delete checkboxValidations.required;
    }

    const defaultChecked =
      field.defaultChecked === true ||
      field.defaultChecked === "true" ||
      field.defaultValue === true ||
      field.defaultValue === "true";

    return (
      <div className={colSpanClass}>
        <Controller
          name={field.api_name}
          control={control}
          rules={checkboxValidations}
          defaultValue={defaultChecked}
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <FormCheckbox
              label={label}
              name={field.api_name}
              checked={value !== undefined ? !!value : defaultChecked}
              onChange={onChange}
              onBlur={onBlur}
              inputRef={ref}
              errors={getError(field.api_name)}
              readOnly={isReadOnly}
            />
          )}
        />
      </div>
    );
  }

  if (normType === "multi_line" && getEditorType(field) === "rich") {
    const richTextValidations = buildRichTextValidations(validations, field);

    return (
      <div className={colSpanClass}>
        <Controller
          name={field.api_name}
          control={control}
          rules={richTextValidations}
          render={({ field: { onChange, onBlur, value } }) => (
            <RichTextEditor
              label={label}
              name={field.api_name}
              value={value || ""}
              onChange={onChange}
              onBlur={onBlur}
              errors={getError(field.api_name)}
              readOnly={isReadOnly}
              placeholder={field.placeholder}
            />
          )}
        />
      </div>
    );
  }

  // Use Controller for complex components
  if (["file_upload", "image_upload", "multi_select", "signature", "user"].includes(normType)) {
    return (
      <div className={colSpanClass}>
        <Controller
          name={field.api_name}
          control={control}
          rules={validations}
          render={({ field: { onChange, value } }) => (
            <Component
              label={field.field_label}
              name={field.api_name}
              value={value ?? (normType === "multi_select" || normType === "user" ? [] : "")}
              onChange={onChange}
              control={control} // For FileUploader
              errors={getError(field.api_name)}
              readOnly={isReadOnly}
              disabled={isDisabled}
              options={field.options || []}
              placeholder={field.placeholder}
              properties={field.properties}
              allowedTypes={
                field.allowedTypes ??
                field.properties?.validation_rules?.allowedTypes ??
                field.properties?.validation_rules?.allowed_types
              }
              maxFileSize={
                field.maxFileSize ??
                field.properties?.validation_rules?.maxFileSize ??
                field.properties?.validation_rules?.max_file_size
              }
            />
          )}
        />
      </div>
    );
  }

  // Use Controller for picklist / select so the native <select> is fully
  // controlled (value prop). The uncontrolled register+defaultValue combo
  // can silently swallow user changes in React 19.
  if (["picklist", "select"].includes(normType)) {
    return (
      <div className={colSpanClass}>
        <Controller
          name={field.api_name}
          control={control}
          rules={validations}
          render={({ field: { onChange, onBlur, value } }) => (
            <Component
              label={label}
              name={field.api_name}
              value={value ?? ""}
              onChange={onChange}
              onBlur={onBlur}
              errors={getError(field.api_name)}
              readOnly={isReadOnly}
              disabled={isDisabled}
              options={field.options || []}
              placeholder={field.placeholder}
              className="w-full"
            />
          )}
        />
      </div>
    );
  }

  const commonProps = {
    label: label,
    name: field.api_name,
    register: register(field.api_name, validations),
    defaultValue: field.defaultValue !== undefined ? field.defaultValue : "",
    errors: getError(field.api_name),
    readOnly: isReadOnly,
    disabled: isDisabled,
    placeholder: field.placeholder,
    className: "w-full",
    ...extraProps,
  };

  return (
    <div className={colSpanClass}>
      <Component {...commonProps} options={field.options || []} />
    </div>
  );
};

const sanitizeOutput = (data: any, schema: Section[]) => {
  if (!Array.isArray(schema)) return data;
  const sanitized = { ...data };

  schema.forEach((section) => {
    if (!section) return;

    if (section.is_subform) {
      const sfKey = section.subform_field_name || section.name;
      if (!sfKey) return;

      const rawRows = data[sfKey] || [];
      const transformedRows = rawRows
        .map((row: any, idx: number) => {
          const sanitizedValues: any = {};
          let hasAnyValue = false;

          section.fields?.forEach((field) => {
            let val = row[field.api_name];
            if (val === undefined || val === null) return;
            
            const normType = getNormalizedType(field.field_type);
            if (normType === "number" && val !== "") {
              val = Number(val);
            }
            sanitizedValues[field.api_name] = val;
            if (val !== "" && val !== null && val !== undefined) {
              hasAnyValue = true;
            }
          });

          if (row.id) hasAnyValue = true;
          return hasAnyValue ? { row: idx + 1, values: { ...row, ...sanitizedValues } } : null;
        })
        .filter(Boolean);

      sanitized[sfKey] = transformedRows;
    } else {
      section?.fields?.forEach((field) => {
        const val = data[field.api_name];
        if (val === undefined || val === null || val === "") return;
        const normType = getNormalizedType(field.field_type);
        if (normType === "number") sanitized[field.api_name] = Number(val);
      });
    }
  });

  return sanitized;
};

const buildDefaultValuesFromSchema = (
  schema: Section[],
  base: Record<string, unknown> = {},
) => {
  const formData: Record<string, unknown> = { ...base };

  schema.forEach((s) => {
    if (s.is_subform) {
      const sfKey = s.subform_field_name || s.name;
      if (sfKey && formData[sfKey] === undefined) {
        formData[sfKey] = [];
      }
      return;
    }

    s?.fields?.forEach((f) => {
      if (!f.api_name || formData[f.api_name] !== undefined) return;
      const normType = getNormalizedType(f.field_type);
      if (normType === "checkbox") {
        // Use defaultChecked or defaultValue set in field config modal
        formData[f.api_name] =
          f.defaultChecked === true ||
          f.defaultChecked === "true" ||
          f.defaultValue === true ||
          f.defaultValue === "true";
      } else if (normType === "image_upload") {
        formData[f.api_name] =
          f.defaultValue !== undefined &&
          f.defaultValue !== null &&
          f.defaultValue !== ""
            ? f.defaultValue
            : null;
      } else if (
        ["multi_select", "file_upload", "user"].includes(normType)
      ) {
        // Use defaultValue array if set, otherwise empty array
        formData[f.api_name] = Array.isArray(f.defaultValue)
          ? f.defaultValue
          : [];
      } else {
        // Use defaultValue (picklist, select, radio, single_line, etc.) if set.
        // Guard against plain objects ({}) which break components like react-phone-number-input.
        const dv = f.defaultValue;
        formData[f.api_name] =
          dv !== undefined && dv !== null && dv !== "" && typeof dv !== "object"
            ? dv
            : "";
      }
    });
  });

  return formData;
};

const mapDataToFormFields = (data: any, schema: Section[], defaultValues = {}) => {
  if (!data || !Array.isArray(schema)) return {};
  const formData: any = {};

  schema.forEach((s) => {
    if (s.is_subform) {
      const sfKey = s.subform_field_name || s.name;
      if (!sfKey) return;

      const rawValue = data[sfKey];
      if (Array.isArray(rawValue)) {
        formData[sfKey] = rawValue.map((item) => {
          if (item && item.values && typeof item.values === "object") {
            return { ...item.values, id: item.id || item.values.id };
          }
          return item;
        });
      } else {
        formData[sfKey] = rawValue || [];
      }
    } else {
      s?.fields?.forEach((f) => {
        if (!f.api_name) return;
        const normType = getNormalizedType(f.field_type);
        const val = data[f.api_name];
        if (val !== undefined && val !== null) {
          if (typeof val === "object" && val?.id !== undefined) {
            formData[f.api_name] = val.id;
          } else if (Array.isArray(val)) {
            formData[f.api_name] = val.map((item) =>
              item?.id !== undefined ? item.id : item,
            );
          } else if (normType === "checkbox") {
            formData[f.api_name] =
              val === true ||
              val === "true" ||
              val === 1 ||
              val === "1";
          } else {
            // Guard: if the API returned a plain object for a scalar field (e.g. phone),
            // normalise to empty string to avoid crashing components like react-phone-number-input.
            if (typeof val === "object" && !Array.isArray(val)) {
              formData[f.api_name] = "";
            } else {
              formData[f.api_name] = normType === "country" ? getCountryISO(val) : val;
            }
          }
        } else if ((defaultValues as any)[f.api_name] !== undefined) {
          formData[f.api_name] = (defaultValues as any)[f.api_name];
        } else if (normType === "checkbox") {
          formData[f.api_name] =
            f.defaultChecked === true ||
            f.defaultChecked === "true" ||
            f.defaultValue === true ||
            f.defaultValue === "true";
        } else if (
          f.defaultValue !== undefined &&
          f.defaultValue !== null &&
          f.defaultValue !== ""
        ) {
          // Honour the default value configured in the field builder
          formData[f.api_name] = f.defaultValue;
        } else {
          formData[f.api_name] = "";
        }
      });
    }
  });

  return formData;
};

const FormRenderer = forwardRef<FormRendererRef, FormRendererProps>(
  ({ schema, defaultValues = {}, autoPopulateData = null, onFieldChange, rules = [], renderMode = "desktop" }, ref) => {
    const forceSingleColumn = renderMode === "phone";
    const initialValuesRef = useRef<Record<string, unknown>>(
      Array.isArray(schema) && schema.length > 0
        ? autoPopulateData
          ? {
              ...defaultValues,
              ...mapDataToFormFields(autoPopulateData, schema, defaultValues),
            }
          : buildDefaultValuesFromSchema(schema, defaultValues)
        : { ...defaultValues },
    );

    const {
      register,
      control,
      watch,
      handleSubmit,
      reset,
      getValues,
      setValue,
      formState: { errors, touchedFields, isSubmitted, dirtyFields },
    } = useForm({
      mode: "onSubmit",
      defaultValues: initialValuesRef.current,
    });

    useEffect(() => {
      if (!onFieldChange) return;
      const sub = watch((v, { name }) => {
          if (name) {
              onFieldChange(name, (v as any)[name]);
          }
      });
      return () => sub.unsubscribe();
    }, [watch, onFieldChange]);

    useEffect(() => {
      if (!Array.isArray(schema) || schema.length === 0) return;

      const merged = autoPopulateData
        ? {
            ...defaultValues,
            ...mapDataToFormFields(autoPopulateData, schema, defaultValues),
          }
        : buildDefaultValuesFromSchema(schema, defaultValues);

      if (JSON.stringify(merged) === JSON.stringify(initialValuesRef.current)) {
        return;
      }

      reset(merged);
      initialValuesRef.current = { ...merged };
    }, [autoPopulateData, schema, reset, defaultValues]);

    const formValues = watch();
    
    const fieldRuleState = React.useMemo(() => {
      if (!rules || rules.length === 0) {
        return new Map<string, FieldRuleState>();
      }
      return buildFieldRuleState(rules, formValues);
    }, [rules, formValues]);

    const getError = (name: string) =>
      touchedFields?.[name] || isSubmitted ? (errors as any)[name] : undefined;

    useImperativeHandle(ref, () => ({
      getFormData: () => sanitizeOutput(getValues(), schema),
      getChangedData: () => {
        const current = sanitizeOutput(getValues(), schema);
        const initial = sanitizeOutput({ ...initialValuesRef.current }, schema);
        const changed: any = {};
        Object.keys(current).forEach((key) => {
          if (!deepEqual(current[key], initial[key])) {
            changed[key] = current[key];
          }
        });
        return changed;
      },
      reset: (v) => reset(v),
      submit: (onSuccess, onError) => {
        handleSubmit((data) => {
          onSuccess(sanitizeOutput(data, schema));
        }, onError)();
      },
      watch,
      setValue,
    }));

    if (!Array.isArray(schema) || schema.length === 0)
      return (
        <div className="p-10 text-center text-gray-400 dark:text-gray-500 font-medium">
          Layout initialization...
        </div>
      );

    return (
      <div className="form-renderer animate-in fade-in slide-in-from-bottom-2 duration-700">
        {[...schema]
          .map((section, index) => ({ section, index }))
          .sort((a, b) => {
            const aSeq = a.section.sequence;
            const bSeq = b.section.sequence;
            if (aSeq != null && bSeq != null && aSeq !== bSeq) {
              return aSeq - bSeq;
            }
            if (aSeq != null && bSeq == null) return -1;
            if (aSeq == null && bSeq != null) return 1;
            return a.index - b.index;
          })
          .map(({ section }) => section)
          .map((section, sIdx) => {
          if (section.is_subform) {
            const sfKey =
              section.subform_field_name ||
              section.name ||
              `subform_${sIdx}`;
            return (
              <div key={sIdx} className="form-section my-6 first:mt-0">
                {section.name && (
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-[14px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">
                      {section.name}
                    </h3>
                    <div className="h-px bg-gradient-to-r from-gray-100 dark:from-slate-700 to-transparent flex-1"></div>
                  </div>
                )}
                <Controller
                  name={sfKey}
                  control={control}
                  defaultValue={[{}]}
                  render={({ field: { onChange, value } }) => (
                    <SubForm
                      label={null}
                      fields={[...(section.fields || [])].filter((f) => !f.is_deleted).sort(
                        (a, b) => (a.order ?? 0) - (b.order ?? 0),
                      )}
                      value={Array.isArray(value) ? value : [{}]}
                      onChange={onChange}
                      required={false}
                    />
                  )}
                />
              </div>
            );
          }

          return (
            <div
              key={sIdx}
              className="form-section my-6 first:mt-0 bg-white/40 dark:bg-slate-900/40 p-1 rounded-2xl"
            >
              {section.name && (
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-[14px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">
                    {section.name}
                  </h3>
                  <div className="h-px bg-gradient-to-r from-gray-100 dark:from-slate-700 to-transparent flex-1"></div>
                </div>
              )}
              <div
                className={`grid gap-x-10 gap-y-7 ${
                  forceSingleColumn || (section.column_count || 2) <= 1
                    ? "grid-cols-1"
                    : "grid-cols-1 md:grid-cols-2"
                }`}
              >
                {[...(section.fields || [])]
                  .filter((f) => !f.is_deleted)
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((f, fIdx) => (
                    <FormField
                      key={`${f?.api_name}-${fIdx}`}
                      field={f}
                      control={control}
                      register={register}
                      watch={watch}
                      setValue={setValue}
                      getError={getError}
                      errors={errors}
                      isSubmitted={isSubmitted}
                      dirtyFields={dirtyFields}
                      sectionFields={section.fields}
                      ruleState={fieldRuleState.get(f.api_name)}
                      forceSingleColumn={forceSingleColumn}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);

FormRenderer.displayName = "FormRenderer";
export default FormRenderer;
