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
import { FieldGroup } from "@/shared/ui";
import FormSectionCard from "@/shared/ui/form-section-card";

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
      city: "",
      state: "",
      zip: "",
      country: "",
    },
  });

  const [isLoading, setIsLoading] = React.useState(false);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const companySizeOptions = [
    "1-10 employees",
    "11-50 employees",
    "51-200 employees",
    "201-500 employees",
    "500+ employees",
  ];

  return (
    <div className="animate-in fade-in flex flex-col rounded-xl border border-slate-200/90 bg-white px-5 py-2 dark:border-slate-700 dark:bg-slate-950 sm:px-8">
      <FormSectionCard
        title="Organization Information"
        icon={<Building2 size={18} strokeWidth={1.75} />}
      >
        <p className="-mt-2 mb-1 text-[length:var(--dash-label-size,0.875rem)] text-slate-500 dark:text-slate-400">
          Update your company details and contact information.
        </p>

        <FieldGroup label="Company Logo" htmlFor="org-logo">
          <div className="flex items-center gap-6">
            <Controller
              name="logo"
              control={control}
              render={({ field: { value, onChange } }) => (
                <ProfilePictureUploader
                  image={value}
                  setImage={(val: any) => onChange(val)}
                  originalImage={initialData?.logo}
                  readOnly={!isEditing}
                  size={100}
                />
              )}
            />
            <p className="text-[length:var(--dash-label-size,0.875rem)] text-slate-500">
              Upload company logo (512×512px recommended)
            </p>
          </div>
        </FieldGroup>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Input
              label="Organization Name"
              register={register("name")}
              errors={errors.name as any}
              readOnly={!isEditing}
              placeholder="TechCorp Solutions"
              fieldRequired
            />
            <span className="text-[11px] text-slate-400">
              This cannot be changed for root organizations
            </span>
          </div>
          <Select
            label="Company Size"
            register={register("size")}
            options={companySizeOptions}
            errors={errors.size as any}
            readOnly={!isEditing}
          />
          <Input
            label="Website URL"
            register={register("website")}
            errors={errors.website as any}
            readOnly={!isEditing}
            placeholder="https://techcorp.com"
          />
          <Select
            label="Timezone"
            register={register("timezone")}
            options={timeZones}
            errors={errors.timezone as any}
            readOnly={!isEditing}
            fieldRequired
          />
          <div className="md:col-span-2">
            <TextBox
              label="Company Description"
              register={register("description")}
              errors={errors.description as any}
              readOnly={!isEditing}
              rows={3}
            />
          </div>
        </div>
      </FormSectionCard>

      <FormSectionCard title="Address Information" icon={<MapPin size={18} strokeWidth={1.75} />}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Input
              label="Street Address"
              register={register("street")}
              errors={errors.street as any}
              readOnly={!isEditing}
              placeholder="123 Business Park Drive"
            />
          </div>
          <LocationSelectorGroup
            register={register}
            watch={watch}
            errors={errors}
            readOnly={!isEditing}
          />
          <Input
            label="Pincode / Zip Code"
            register={register("zip")}
            errors={errors.zip as any}
            readOnly={!isEditing}
            placeholder="94102"
          />
        </div>
      </FormSectionCard>
    </div>
  );
});

OrganizationalDetail.displayName = "OrganizationalDetail";

export default OrganizationalDetail;
