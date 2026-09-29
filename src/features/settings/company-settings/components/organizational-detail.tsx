"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { Building2, MapPin } from "lucide-react";
import { Country, State } from "country-state-city";
import Input from "@/shared/form/components/input";
import Select from "@/shared/form/components/select";
import TextBox from "@/shared/form/components/text-box";
import ProfilePictureUploader from "@/shared/components/profile-picture-uploader";
import { updateOrganizationDetails } from "../api/company-settings.api";
import { OrganizationDetails } from "../types/types";
import {
  buildDirtyOrganizationPatch,
  hasDirtyFields,
  ORGANIZATION_TAB_FIELDS,
} from "../utils/company-settings-diff.util";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { useTranslations } from "next-intl";
import { timeZones } from "@/shared/constants/timezones";
import { AddressFormFields, FormFieldRow, FormFieldSpanFull } from "@/shared/ui";
import FormSectionCard from "@/shared/ui/form-section-card";
import { cn } from "@/core/utils/http.util";

interface OrganizationalDetailProps {
  isEditing: boolean;
  initialData: OrganizationDetails;
  onSaveSuccess?: (data?: OrganizationDetails) => void;
}

export interface OrganizationalDetailRef {
  submit: () => void;
}

type OrgFormValues = {
  logo: string | null | File;
  name: string;
  size: string;
  description: string;
  website: string;
  timezone: string;
  address_line_1: string;
  address_line_2: string;
  country_iso: string;
  state_iso: string;
  city: string;
  pincode: string;
};

function normalizeCountryIso(rawCountry: string) {
  const normalized = (rawCountry ?? "").trim();
  if (!normalized) return "";

  const byCode = Country.getCountryByCode(normalized);
  if (byCode) return byCode.isoCode;

  const byName = Country.getAllCountries().find(
    (country) => country.name.trim().toLowerCase() === normalized.toLowerCase(),
  );
  return byName?.isoCode ?? "";
}

function normalizeStateIso(countryIso: string, rawState: string) {
  const normalized = (rawState ?? "").trim();
  if (!countryIso || !normalized) return "";

  const subdivisions = State.getStatesOfCountry(countryIso);
  const byCode = subdivisions.find((state) => state.isoCode === normalized);
  if (byCode) return byCode.isoCode;

  const byName = subdivisions.find(
    (state) => state.name.trim().toLowerCase() === normalized.toLowerCase(),
  );
  return byName?.isoCode ?? "";
}

function toFormValues(data: OrganizationDetails): OrgFormValues {
  const countryIso = normalizeCountryIso(data.country ?? "");
  const stateIso = normalizeStateIso(countryIso, data.state ?? "");
  return {
    logo: data.logo ?? null,
    name: data.name ?? "",
    size: data.size ?? "",
    description: data.description ?? "",
    website: data.website ?? "",
    timezone: data.timezone ?? "",
    address_line_1: data.street ?? "",
    address_line_2: data.street2 ?? "",
    country_iso: countryIso,
    state_iso: stateIso,
    city: data.city ?? "",
    pincode: data.zip ?? "",
  };
}

function toOrganizationPatch(data: OrgFormValues): Partial<OrganizationDetails> {
  return {
    logo: data.logo,
    name: data.name,
    size: data.size,
    description: data.description,
    website: data.website,
    timezone: data.timezone,
    street: data.address_line_1,
    street2: data.address_line_2,
    country: data.country_iso,
    state: data.state_iso,
    city: data.city,
    zip: data.pincode,
  };
}

const OrganizationalDetail = React.forwardRef<
  OrganizationalDetailRef,
  OrganizationalDetailProps
>(({ isEditing, initialData, onSaveSuccess }, ref) => {
  const t = useTranslations("Dashboard.settingsCompany");
  const {
    register,
    control,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrgFormValues>({
    defaultValues: toFormValues(initialData),
  });

  React.useEffect(() => {
    if (initialData) {
      reset(toFormValues(initialData));
    }
  }, [initialData, reset]);

  const onSubmit = async (data: OrgFormValues) => {
    try {
      const current = { ...initialData, ...toOrganizationPatch(data) } as OrganizationDetails;
      const patch = buildDirtyOrganizationPatch(
        initialData,
        current,
        ORGANIZATION_TAB_FIELDS,
      );

      if (!hasDirtyFields(patch)) {
        toastSuccess(t("noChangesToast"));
        return;
      }

      const updated = await updateOrganizationDetails(1, patch);
      toastSuccess(t("organizationUpdatedToast"));
      onSaveSuccess?.(updated);
    } catch (error) {
      console.error("Failed to update organization details:", error);
      toastApiError(error);
    }
  };

  React.useImperativeHandle(ref, () => ({
    submit: () => {
      handleSubmit(onSubmit)();
    },
  }));

  const companySizeOptions = [
    "1-10 employees",
    "11-50 employees",
    "51-200 employees",
    "201-500 employees",
    "500+ employees",
  ];

  return (
    <div
      className={cn(
        "settings-aligned-fields w-full min-w-0 overflow-x-hidden rounded-xl border border-slate-200/90 bg-white",
        "px-4 py-5 sm:px-6 sm:py-6 dark:border-slate-800 dark:bg-slate-950",
      )}
    >
      <FormSectionCard
        title={t("orgSectionTitle")}
        icon={<Building2 size={18} strokeWidth={1.75} />}
      >
        <p className="-mt-3 mb-1 text-sm text-slate-500 dark:text-slate-400">
          {t("orgSectionSubtitle")}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <Controller
            name="logo"
            control={control}
            render={({ field: { value, onChange } }) => (
              <ProfilePictureUploader
                image={value}
                setImage={(val) => {
                  if (val == null) {
                    onChange(null);
                    return;
                  }
                  if (typeof val === "string" || val instanceof File) {
                    onChange(val);
                    return;
                  }
                  if (val instanceof Blob) {
                    onChange(new File([val], "company-logo", { type: val.type || "image/png" }));
                    return;
                  }
                  onChange(null);
                }}
                originalImage={typeof initialData?.logo === "string" ? initialData.logo : undefined}
                readOnly={!isEditing}
                size={88}
              />
            )}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {t("logoLabel")}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t("logoHint")}
            </p>
          </div>
        </div>

        <FormFieldRow cols="2">
          <Input
            label={t("fields.name")}
            register={register("name")}
            errors={errors.name as never}
            readOnly={!isEditing}
            placeholder={t("placeholders.name")}
            fieldRequired
          />
          <Select
            label={t("fields.size")}
            register={register("size")}
            options={companySizeOptions}
            errors={errors.size as never}
            readOnly={!isEditing}
          />
          <Input
            label={t("fields.website")}
            register={register("website")}
            errors={errors.website as never}
            readOnly={!isEditing}
            placeholder={t("placeholders.website")}
          />
          <Select
            label={t("fields.timezone")}
            register={register("timezone")}
            options={timeZones}
            errors={errors.timezone as never}
            readOnly={!isEditing}
            fieldRequired
          />
          <FormFieldSpanFull>
            <TextBox
              label={t("fields.description")}
              register={register("description")}
              errors={errors.description as never}
              readOnly={!isEditing}
              rows={3}
            />
          </FormFieldSpanFull>
        </FormFieldRow>
      </FormSectionCard>

      <FormSectionCard
        title={t("addressSectionTitle")}
        icon={<MapPin size={18} strokeWidth={1.75} />}
      >
        <AddressFormFields
          idPrefix="org-address"
          control={control}
          register={register}
          setValue={setValue}
          disabled={!isEditing}
          addressLineLayout="row"
          labels={{
            addressLine1: t("fields.address1"),
            addressLine2: t("fields.address2"),
            country: t("fields.country"),
            state: t("fields.state"),
            city: t("fields.city"),
            pincode: t("fields.zip"),
          }}
          placeholders={{
            country: t("placeholders.country"),
            state: t("placeholders.state"),
            city: t("placeholders.city"),
          }}
          errors={{
            address_line_1: errors.address_line_1?.message,
            address_line_2: errors.address_line_2?.message,
            country_iso: errors.country_iso?.message,
            state_iso: errors.state_iso?.message,
            city: errors.city?.message,
            pincode: errors.pincode?.message,
          }}
        />
      </FormSectionCard>
    </div>
  );
});

OrganizationalDetail.displayName = "OrganizationalDetail";

export default OrganizationalDetail;
