"use client"
import ProfilePictureUploader from '@/shared/components/profile-picture-uploader'
import Input from '@/shared/form/components/input';
import Select from '@/shared/form/components/select';
import TextBox from '@/shared/form/components/text-box';
import { AppButton, SurfacePhoneField } from '@/shared/ui';
import FormSectionCard from '@/shared/ui/form-section-card';
import { BookUser, Calendar, Home, Mail, MapPin, Phone, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form';
import { Inputs } from '../types/types';
import { updatePersonalProfile } from '../api/personal-profile.api';
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";

const PersonalProfileForm = ({ 
    isEditing, 
    initialData, 
    isLoading,
    onSuccess
}: { 
    isEditing: boolean, 
    initialData?: any, 
    isLoading?: boolean,
    onSuccess?: () => void
}) => {
    const [image, setImage] = useState<File | string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<Inputs>({
        defaultValues: {
            firstName: "",
            lastName: "",
            dob: "",
            gender: "male",
            role: "Senior Driver",
            joiningDate: "",
            emails: [{ email: "" }],
            phones: [{ phone: "" }],
            addresses: [{ address: "123 Market Street, Suite 400\nSan Francisco, CA 94105\nUnited States", isPrimary: true }]
        }
    })

    // Reset form when initialData is loaded
    useEffect(() => {
        if (initialData) {
            const rawPhone = initialData.user_detail?.phone_number || "";
            const formattedPhone = rawPhone && !rawPhone.startsWith('+') ? `+${rawPhone}` : rawPhone;

            reset({
                firstName: initialData.user_detail?.user?.first_name || initialData.user_detail?.first_name || "",
                lastName: initialData.user_detail?.user?.last_name || initialData.user_detail?.last_name || "",
                gender: initialData.user_detail?.gender?.toLowerCase() || "male",
                emails: [{ email: initialData.user_detail?.user?.email || initialData.user_detail?.email || "" }],
                phones: [{ phone: formattedPhone || initialData.user_detail?.user?.phone_number || "" }],
                joiningDate: initialData.created_at?.split('T')[0] || "",
                role: "Senior Driver",
                dob: "",
                addresses: [{ address: "123 Market Street, Suite 400\nSan Francisco, CA 94105\nUnited States", isPrimary: true }]
            });
            
            if (initialData.user_detail?.user_image) {
                setImage(initialData.user_detail.user_image);
            }
        }
    }, [initialData, reset]);

    const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({
        control,
        name: "emails"
    });

    const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({
        control,
        name: "phones"
    });

    const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
        control,
        name: "addresses"
    });

    const handleActualSubmit = async (data: Inputs) => {
        if (!initialData?.id) return;
        
        setIsSaving(true);
        try {
            // Using FormData for file upload support
            const formData = new FormData();
            
            // Nested structure support (if server expects user.first_name)
            formData.append("user.first_name", data.firstName);
            formData.append("user.last_name", data.lastName);
            formData.append("user.email", data.emails[0]?.email || "");
            
            // Flat structure support
            formData.append("first_name", data.firstName);
            formData.append("last_name", data.lastName);
            formData.append("gender", data.gender.charAt(0).toUpperCase() + data.gender.slice(1));
            formData.append("phone_number", data.phones[0]?.phone?.replace('+', '') || "");

            // Only append image if it's a new file
            if (image instanceof File) {
                formData.append("user_image", image);
            }

            await updatePersonalProfile(String(initialData.id), formData);
            
            toastSuccess("Profile updated successfully!");
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Failed to update profile:", error);
            toastError("Failed to update profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="w-full space-y-6 animate-pulse">
                <div className="h-32 bg-slate-100 rounded-xl dark:bg-slate-800" />
                <div className="h-64 bg-slate-100 rounded-xl dark:bg-slate-800" />
                <div className="h-96 bg-slate-100 rounded-xl dark:bg-slate-800" />
            </div>
        );
    }

    return (
        <form className='flex flex-col gap-6 w-full pb-10' encType='multipart/form-data' onSubmit={handleSubmit(handleActualSubmit)}>
            {/* Header / Basic Info Summary */}
            <div className='flex w-full border border-gray-200 rounded-xl shadow-sm p-5 bg-white gap-6 items-center dark:bg-slate-800 dark:border-slate-700'>
                <ProfilePictureUploader 
                    image={image} 
                    setImage={setImage} 
                    size={110} 
                    readOnly={!isEditing} 
                />
                <div className='flex flex-col gap-2'>
                    <h1 className='text-3xl font-bold text-slate-900 dark:text-white'>
                        {initialData?.user_detail?.first_name || "Alex"} {initialData?.user_detail?.last_name || "Morgan"}
                    </h1>
                    <span className='px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold w-fit dark:bg-slate-700 dark:text-slate-300'>
                        {initialData?.role_detail?.name || "Senior Driver"}
                    </span>
                    <div className='flex gap-5 mt-1'>
                        <div className='flex items-center gap-2 text-slate-500 dark:text-slate-400'>
                            <Calendar size={16} />
                            <span className='text-sm'>
                                Joined {initialData?.created_at ? new Date(initialData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Oct 2023"}
                            </span>
                        </div>
                        <div className='flex items-center gap-2 text-slate-500 dark:text-slate-400'>
                            <MapPin size={16} />
                            <span className='text-sm'>Alexandria, Egypt</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Basic Information */}
            <FormSectionCard title='Basic Information' icon={<Calendar size={20} />} >
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2'>
                    <Input label="First Name" register={register("firstName")} errors={errors.firstName} readOnly={!isEditing} />
                    <Input label="Last Name" register={register("lastName")} errors={errors.lastName} readOnly={!isEditing} />
                    <Input label="Date of Birth" type='date' register={register("dob")} errors={errors.dob} readOnly={!isEditing} />
                    <Select
                        label="Gender"
                        register={register("gender")}
                        readOnly={!isEditing}
                        options={[
                            { label: "Male", value: "male" },
                            { label: "Female", value: "female" },
                            { label: "Other", value: "other" },
                        ]}
                    />
                    <Input label="Role/Job Title" register={register("role")} errors={errors.role} readOnly={!isEditing} />
                    <Input label="Date of Joining" type='date' register={register("joiningDate")} errors={errors.joiningDate} readOnly={!isEditing} />
                </div>
            </FormSectionCard>

            {/* Contact Details */}
            <FormSectionCard title="Contact Details" icon={<BookUser size={20} />} >
                <div className='flex flex-col gap-8 pt-2'>

                    {/* Emails Section */}
                    <div className='space-y-4'>
                        <div className='flex items-center justify-between'>
                            <h3 className='text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2'>
                                <Mail size={14} /> Email Addresses
                            </h3>
                            {isEditing && (
                                <AppButton
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => appendEmail({ email: "" })}
                                    className="gap-2"
                                >
                                    <Plus size={14} /> Add Email
                                </AppButton>
                            )}
                        </div>
                        <div className='space-y-3'>
                            {emailFields.map((field, index) => (
                                <div key={field.id} className='flex gap-3 items-end group'>
                                    <Input
                                        register={register(`emails.${index}.email` as const)}
                                        placeholder="Enter email address"
                                        className="flex-1"
                                        readOnly={!isEditing}
                                    />
                                    {isEditing && emailFields.length > 1 && (
                                        <AppButton
                                            variant="ghost"
                                            size="sm"
                                            className="size-11 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            onClick={() => removeEmail(index)}
                                        >
                                            <Trash2 size={18} />
                                        </AppButton>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className='h-px bg-slate-100 dark:bg-slate-700/50' />

                    {/* Phones Section */}
                    <div className='space-y-4'>
                        <div className='flex items-center justify-between'>
                            <h3 className='text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2'>
                                <Phone size={14} /> Phone Numbers
                            </h3>
                            {isEditing && (
                                <AppButton
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => appendPhone({ phone: "" })}
                                    className="gap-2"
                                >
                                    <Plus size={14} /> Add Phone
                                </AppButton>
                            )}
                        </div>
                        <div className='space-y-3'>
                            {phoneFields.map((field, index) => (
                                <div key={field.id} className='flex gap-3 items-start group'>
                                    <SurfacePhoneField
                                        control={control}
                                        name={`phones.${index}.phone` as const}
                                        id={`phone-${index}`}
                                        label=""
                                        className="flex-1"
                                        disabled={!isEditing}
                                    />
                                    {isEditing && phoneFields.length > 1 && (
                                        <AppButton
                                            variant="ghost"
                                            size="sm"
                                            className="mt-1.5 size-11 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            onClick={() => removePhone(index)}
                                        >
                                            <Trash2 size={18} />
                                        </AppButton>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className='h-px bg-slate-100 dark:bg-slate-700/50' />

                    {/* Addresses Section */}
                    <div className='space-y-4'>
                        <div className='flex items-center justify-between'>
                            <h3 className='text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2'>
                                <Home size={14} /> Addresses
                            </h3>
                            {isEditing && (
                                <AppButton
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => appendAddress({ address: "", isPrimary: false })}
                                    className="gap-2"
                                >
                                    <Plus size={14} /> Add Address
                                </AppButton>
                            )}
                        </div>
                        <div className='space-y-6'>
                            {addressFields.map((field, index) => (
                                <div key={field.id} className='relative flex gap-4 items-start p-5 rounded-xl border border-slate-200 bg-slate-50/50 group dark:border-slate-700 dark:bg-slate-900/30'>
                                    {field.isPrimary && (
                                        <span className='absolute top-4 right-4 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-tight dark:bg-blue-900/40 dark:text-blue-300'>
                                            Primary
                                        </span>
                                    )}
                                    <div className='p-2.5 rounded-lg bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700 shrink-0'>
                                        <Home size={22} className='text-slate-400' />
                                    </div>
                                    <div className='flex-1 space-y-3'>
                                        <TextBox
                                            register={register(`addresses.${index}.address` as const)}
                                            placeholder="Enter full address"
                                            rows={3}
                                            className="bg-white/80"
                                            readOnly={!isEditing}
                                        />
                                    </div>
                                    {isEditing && addressFields.length > 1 && (
                                        <AppButton
                                            variant="ghost"
                                            size="sm"
                                            className="mt-1 size-10 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            onClick={() => removeAddress(index)}
                                        >
                                            <Trash2 size={18} />
                                        </AppButton>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </FormSectionCard>
            {isEditing && (
                <div className='flex w-full item-center justify-end'>
                    <AppButton variant="primary" size="sm" type='submit' disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Changes"}
                    </AppButton>
                </div>
            )}
        </form>
    )
}

export default PersonalProfileForm;
