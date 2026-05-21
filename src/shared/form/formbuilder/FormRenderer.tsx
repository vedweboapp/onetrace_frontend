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
import SignaturePad from "../components/signature-pad";
import UsersSelect from "../components/users-select";
import ProfilePictureUploader from "../../components/profile-picture-uploader";
import { Country } from "country-state-city";
import CountrySelect from "../components/CountrySelect";
import StateSelect from "../components/StateSelect";
import CitySelect from "../components/CitySelect";

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
}

export interface FormRendererRef {
  getFormData: () => any;
  getChangedData: () => any;
  reset: (values: any) => void;
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
  state: StateSelect,
  city: CitySelect,
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

const getNormalizedType = (type: string) => {
  return type || "single_line";
};

const getCountryISO = (name: string) => {
  if (!name || typeof name !== "string") return name;
  if (name.length === 2 && /^[A-Z]{2}$/.test(name)) return name;
  const match = Country.getAllCountries().find(
    (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim(),
  );
  return match ? match.isoCode : name;
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
}) => {
  if (!field || !field.api_name) return null;

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

  const isRequired = !!validations.required;

  const label = (
    <div className="flex items-center gap-1 mb-1">
      <span className="text-[13px] font-bold text-gray-600 uppercase tracking-wide">
        {field.field_label}
      </span>
      {isRequired && (
        <span className="text-red-500 font-bold text-sm ml-0.5">*</span>
      )}
    </div>
  );

  const colSpan = field.colspan || 1;
  const colSpanClass =
    colSpan === 2
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
          readOnly={field.readOnly}
          placeholder={field.placeholder}
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
              value={value}
              onChange={onChange}
              control={control} // For FileUploader
              errors={getError(field.api_name)}
              readOnly={field.readOnly}
              options={field.options || []}
              placeholder={field.placeholder}
              properties={field.properties}
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
    errors: getError(field.api_name),
    readOnly: field.readOnly,
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
        const val = data[f.api_name];
        if (val !== undefined && val !== null) {
          const normType = getNormalizedType(f.field_type);
          if (typeof val === "object" && val?.id !== undefined) {
            formData[f.api_name] = val.id;
          } else if (Array.isArray(val)) {
            formData[f.api_name] = val.map((item) =>
              item?.id !== undefined ? item.id : item,
            );
          } else {
            formData[f.api_name] = normType === "country" ? getCountryISO(val) : val;
          }
        } else if ((defaultValues as any)[f.api_name] !== undefined) {
          formData[f.api_name] = (defaultValues as any)[f.api_name];
        } else {
          formData[f.api_name] = "";
        }
      });
    }
  });

  return formData;
};

const FormRenderer = forwardRef<FormRendererRef, FormRendererProps>(
  ({ schema, defaultValues = {}, autoPopulateData = null, onFieldChange }, ref) => {
    const initialValuesRef = useRef(
      autoPopulateData
        ? {
            ...defaultValues,
            ...mapDataToFormFields(autoPopulateData, schema, defaultValues),
          }
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
      if (!autoPopulateData) return;
      const mapped = mapDataToFormFields(
        autoPopulateData,
        schema,
        defaultValues,
      );
      if (JSON.stringify(mapped) === JSON.stringify(initialValuesRef.current))
        return;
      reset(mapped);
      initialValuesRef.current = { ...mapped };
    }, [autoPopulateData, schema, reset, defaultValues]);

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
        <div className="p-10 text-center text-gray-400 font-medium">
          Layout initialization...
        </div>
      );

    return (
      <div className="form-renderer animate-in fade-in slide-in-from-bottom-2 duration-700">
        {[...schema]
          .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
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
                    <h3 className="text-[14px] font-bold text-gray-800 uppercase tracking-widest">
                      {section.name}
                    </h3>
                    <div className="h-px bg-gradient-to-r from-gray-100 to-transparent flex-1"></div>
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
              className="form-section my-6 first:mt-0 bg-white/40 p-1 rounded-2xl"
            >
              {section.name && (
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-[14px] font-bold text-gray-800 uppercase tracking-widest">
                    {section.name}
                  </h3>
                  <div className="h-px bg-gradient-to-r from-gray-100 to-transparent flex-1"></div>
                </div>
              )}
              <div
                className={`grid grid-cols-1 md:grid-cols-${section.column_count || 2} gap-x-10 gap-y-7`}
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
