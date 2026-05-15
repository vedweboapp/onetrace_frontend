"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { Building2 } from "lucide-react";
import Input from "@/shared/form/components/input";
import Select from "@/shared/form/components/select";
import TextBox from "@/shared/form/components/text-box";
import ProfilePictureUploader from "@/shared/components/profile-picture-uploader";
import { LocationSelectorGroup } from "@/shared/form/components/location-selectors";
import { getOrganizationDetails, updateOrganizationDetails } from "../api/company-settings.api";
import { OrganizationDetails } from "../types/types";
import { toast } from "sonner";

interface OrganizationalDetailProps {
    isEditing: boolean;
    onSaveSuccess?: () => void;
}

export interface OrganizationalDetailRef {
    submit: () => void;
}

const OrganizationalDetail = React.forwardRef<OrganizationalDetailRef, OrganizationalDetailProps>(({ isEditing, onSaveSuccess }, ref) => {
    const { register, control, watch, handleSubmit, reset, formState: { errors } } = useForm<any>({
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
            country: ""
        }
    });

    const [isLoading, setIsLoading] = React.useState(true);

    // Fetch data on mount
    React.useEffect(() => {
        const fetchData = async () => {
            try {
                // Using hardcoded ID 1 for now as per path example, or could be from auth context
                const data = await getOrganizationDetails(1);
                reset(data);
            } catch (error) {
                console.error("Failed to fetch organization details:", error);
                toast.error("Failed to load organization details");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [reset]);

    const onSubmit = async (data: any) => {
        try {
            await updateOrganizationDetails(1, data);
            toast.success("Organization details updated successfully");
            onSaveSuccess?.();
        } catch (error) {
            console.error("Failed to update organization details:", error);
            toast.error("Failed to save changes");
        }
    };

    React.useImperativeHandle(ref, () => ({
        submit: () => {
            handleSubmit(onSubmit)();
        }
    }));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const companySizeOptions = [
        "1-10 employees",
        "11-50 employees",
        "51-200 employees",
        "201-500 employees",
        "500+ employees"
    ];

    const timezoneOptions = [
        "UTC-8 (Pacific Time)",
        "UTC-5 (Eastern Time)",
        "UTC+0 (GMT)",
        "UTC+1 (Central European Time)"
    ];

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Organization Information Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-900 dark:text-gray-100">
                            <Building2 size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Organization Information</h2>
                            <p className="text-sm text-gray-500">Update your company details and contact information.</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 flex flex-col gap-8">
                    {/* Company Logo */}
                    <div className="flex flex-col gap-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Company Logo</label>
                        <div className="flex items-center gap-6">
                            <Controller
                                name="logo"
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                    <ProfilePictureUploader
                                        image={value}
                                        setImage={(val: any) => onChange(val)}
                                        readOnly={!isEditing}
                                        size={100}
                                    />
                                )}
                            />
                            <div className="flex flex-col gap-3">
                                <p className="text-xs text-gray-500">Upload a square logo (512x512px recommended)</p>
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        disabled={!isEditing}
                                        className="px-4 py-2 bg-gray-900 dark:bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Upload Logo
                                    </button>
                                    <button 
                                        type="button"
                                        disabled={!isEditing}
                                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Basic Info Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                            <Input
                                label="Organization Name"
                                register={register("name")}
                                errors={errors.name as any}
                                readOnly={!isEditing}
                                placeholder="TechCorp Solutions"
                            />
                            <span className="text-[11px] text-gray-400">This cannot be changed for root organizations</span>
                        </div>
                        <Select
                            label="Company Size"
                            register={register("size")}
                            options={companySizeOptions}
                            errors={errors.size as any}
                            readOnly={!isEditing}
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
                            options={timezoneOptions}
                            errors={errors.timezone as any}
                            readOnly={!isEditing}
                        />
                    </div>
                </div>
            </div>

            {/* Address Information Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Address Information</h2>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>
        </div>
    );
});

export default OrganizationalDetail;
