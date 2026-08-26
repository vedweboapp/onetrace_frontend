"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { Building2, MapPin } from "lucide-react";
import Input from "@/shared/form/components/input";
import Select from "@/shared/form/components/select";
import TextBox from "@/shared/form/components/text-box";
import ProfilePictureUploader from "@/shared/components/profile-picture-uploader";
import { LocationSelectorGroup } from "@/shared/form/components/location-selectors";
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
import { FormFieldRow, FormFieldSpanFull } from "@/shared/ui";
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

const OrganizationalDetail = React.forwardRef<
  OrganizationalDetailRef,
  OrganizationalDetailProps
>(({ isEditing, initialData, onSaveSuccess }, ref) => {
  const t = useTranslations("Dashboard.settingsCompany");
  const {
    register,
    control,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({
    defaultValues: {
      logo: null,
      name: "",
      size: "",
      description: "",
      website: "",
      timezone: "",
      street: "",
      street2: "",
      city: "",
      state: "",
      zip: "",
      country: "",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const onSubmit = async (data: any) => {
    try {
      const current = { ...initialData, ...data } as OrganizationDetails;
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
                setImage={(val: any) => onChange(val)}
                originalImage={initialData?.logo}
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
            errors={errors.name as any}
            readOnly={!isEditing}
            placeholder={t("placeholders.name")}
            fieldRequired
          />
          <Select
            label={t("fields.size")}
            register={register("size")}
            options={companySizeOptions}
            errors={errors.size as any}
            readOnly={!isEditing}
          />
          <Input
            label={t("fields.website")}
            register={register("website")}
            errors={errors.website as any}
            readOnly={!isEditing}
            placeholder={t("placeholders.website")}
          />
          <Select
            label={t("fields.timezone")}
            register={register("timezone")}
            options={timeZones}
            errors={errors.timezone as any}
            readOnly={!isEditing}
            fieldRequired
          />
          <FormFieldSpanFull>
            <TextBox
              label={t("fields.description")}
              register={register("description")}
              errors={errors.description as any}
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
        <FormFieldRow cols="2">
          <Input
            label={t("fields.address1")}
            register={register("street")}
            errors={errors.street as any}
            readOnly={!isEditing}
            placeholder={t("placeholders.address1")}
          />
          <Input
            label={t("fields.address2")}
            register={register("street2")}
            errors={errors.street2 as any}
            readOnly={!isEditing}
            placeholder={t("placeholders.address2")}
          />
          <LocationSelectorGroup
            register={register}
            watch={watch}
            errors={errors}
            readOnly={!isEditing}
          />
          <Input
            label={t("fields.zip")}
            register={register("zip")}
            errors={errors.zip as any}
            readOnly={!isEditing}
            placeholder={t("placeholders.zip")}
          />
        </FormFieldRow>
      </FormSectionCard>
    </div>
  );
});

OrganizationalDetail.displayName = "OrganizationalDetail";

export default OrganizationalDetail;
