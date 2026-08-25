"use client";
import ProfilePictureUploader from "@/shared/components/profile-picture-uploader";
import Input from "@/shared/form/components/input";
import Select from "@/shared/form/components/select";
import { AddressPlaceAutocomplete } from "@/shared/components/maps/address-place-autocomplete";
import {
    AppButton,
    CascadingLocationFields,
    FieldGroup,
    FormFieldRow,
    SurfacePhoneField,
    surfaceInputClassName,
} from "@/shared/ui";
import FormSectionCard from "@/shared/ui/form-section-card";
import { usePhoneCountryFromAddresses } from "@/shared/hooks/use-phone-country-from-address";
import { FIELD_MAX_LENGTH } from "@/shared/form/field-max-length.util";
import { sanitizeAddressInput, sanitizeDigitsInput } from "@/shared/form/field-input.util";
import type { PlaceSuggestion } from "@/shared/types/place-suggestion.types";
import { buildAddressSearchContext } from "@/shared/utils/address-place-form.util";
import { cn } from "@/core/utils/http.util";
import {
    Calendar,
    Mail,
    Phone,
    Plus,
    Trash2,
} from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { City, Country, State } from "country-state-city";
import { Inputs } from "../types/types";
import { updatePersonalProfile } from "../api/personal-profile.api";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { useTranslations } from "next-intl";

const normalizeCountryIso = (rawCountry: string) => {
    const normalized = (rawCountry ?? "").trim();
    if (!normalized) return "";

    const byCode = Country.getCountryByCode(normalized);
    if (byCode) return byCode.isoCode;

    const byName = Country.getAllCountries().find(
        (country) => country.name.trim().toLowerCase() === normalized.toLowerCase(),
    );
    return byName?.isoCode ?? "";
};

const normalizeStateIso = (countryIso: string, rawState: string) => {
    const normalized = (rawState ?? "").trim();
    if (!countryIso || !normalized) return "";

    const subdivisions = State.getStatesOfCountry(countryIso);
    const byCode = subdivisions.find((state) => state.isoCode === normalized);
    if (byCode) return byCode.isoCode;

    const byName = subdivisions.find(
        (state) => state.name.trim().toLowerCase() === normalized.toLowerCase(),
    );
    return byName?.isoCode ?? "";
};

function applyPlaceToProfileAddress(
    setValue: ReturnType<typeof useForm<Inputs>>["setValue"],
    index: number,
    place: PlaceSuggestion,
) {
    const opts = { shouldDirty: true, shouldTouch: true, shouldValidate: true } as const;
    const text = (value: string | null | undefined) => (value ?? "").trim();
    setValue(`addresses.${index}.address1`, text(place.line1), opts);
    setValue(`addresses.${index}.address2`, text(place.line2), opts);
    setValue(`addresses.${index}.country_iso`, text(place.countryIso), opts);
    setValue(`addresses.${index}.state_iso`, text(place.stateIso), opts);
    setValue(`addresses.${index}.city`, text(place.city), opts);
    setValue(`addresses.${index}.pincode`, text(place.pincode), opts);
}

export interface PersonalProfileFormHandle {
    submit: () => void;
    isSaving: boolean;
}

const PersonalProfileForm = forwardRef<
    PersonalProfileFormHandle,
    {
        isEditing: boolean;
        initialData?: any;
        isLoading?: boolean;
        onSuccess?: () => void;
        isSaving?: boolean;
        setIsSaving?: (val: boolean) => void;
    }
>(({ isEditing, initialData, isLoading, onSuccess, isSaving: externalIsSaving, setIsSaving: externalSetIsSaving }, ref) => {
    const t = useTranslations("Dashboard.settingsPersonalProfile");
    const [image, setImage] = useState<File | Blob | string | null | undefined>(
        undefined,
    );
    const [localIsSaving, setLocalIsSaving] = useState(false);
    const isSaving = externalIsSaving ?? localIsSaving;
    const setIsSaving = externalSetIsSaving ?? setLocalIsSaving;
    const [isMounted, setIsMounted] = useState(false);
    const [deletedEmails, setDeletedEmails] = useState([]);
    const [deletedPhones, setDeletedPhones] = useState([]);
    const [deletedAddress, setDeletedAddress] = useState([]);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        setError,
        formState: { errors },
    } = useForm<Inputs>({
        defaultValues: {
            firstName: "",
            lastName: "",
            date_of_birth: "",
            gender: "male",
            // role: "Senior Driver",
            joiningDate: "",
            emails: [{ email: "", is_primary: true }],
            phones: [{ phone: "", is_primary: true }],
            addresses: [
                {
                    address1: "",
                    address2: "",
                    country_iso: "",
                    state_iso: "",
                    city: "",
                    pincode: "",
                    is_primary: true,
                },
            ],
        },
    });

    // Reset form when initialData is loaded
    useEffect(() => {
        if (initialData) {
            const rawPhone = initialData.user_detail?.phone_number || "";
            const formattedPhone =
                rawPhone && !rawPhone.startsWith("+") ? `+${rawPhone}` : rawPhone;
            setImage(initialData.user_detail?.user_image);
            reset({
                role:initialData?.role_detail?.role_name,
                firstName:
                    initialData.user_detail?.user?.first_name ||
                    initialData.user_detail?.first_name ||
                    "",
                lastName:
                    initialData.user_detail?.user?.last_name ||
                    initialData.user_detail?.last_name ||
                    "",
                gender: initialData.user_detail?.gender?.toLowerCase() || "male",
                emails: initialData?.emails?.map((email: any) => ({
                    id: email?.id,
                    email: email.email,
                    is_primary: email?.is_primary,
                })),
                phones: initialData?.phones?.map((phone: any) => ({
                    id: phone?.id,
                    phone: phone?.phone,
                    is_primary: phone?.is_primary,
                })),
                joiningDate: initialData.created_at?.split("T")[0] || "",
                // role: "Senior Driver",
                date_of_birth: initialData?.user_detail?.date_of_birth,
                addresses: initialData?.addresses?.length
                    ? initialData.addresses.map((address: any) => {
                          const rawCountry = (address?.country_iso ?? address?.country ?? "").trim();
                          const countryIso = normalizeCountryIso(rawCountry);
                          const rawState = (address?.state_iso ?? address?.state ?? "").trim();
                          const stateIso = normalizeStateIso(countryIso || rawCountry, rawState);

                          return {
                              id: address?.id,
                              address1: address?.address1 ?? address?.address_1 ?? "",
                              address2: address?.address2 ?? address?.address_2 ?? "",
                              country_iso: countryIso || rawCountry,
                              state_iso: stateIso || rawState,
                              city: address?.city ?? "",
                              pincode: address?.pincode ?? "",
                              is_primary: address?.is_primary || false,
                          };
                      })
                    : [
                          {
                              address1: "",
                              address2: "",
                              country_iso: "",
                              state_iso: "",
                              city: "",
                              pincode: "",
                              is_primary: true,
                          },
                      ],
            });
        }
    }, [initialData, reset]);

    const {
        fields: emailFields,
        append: appendEmail,
        remove: removeEmail,
    } = useFieldArray({
        control,
        name: "emails",
    });

    const {
        fields: phoneFields,
        append: appendPhone,
        remove: removePhone,
    } = useFieldArray({
        control,
        name: "phones",
    });

    const {
        fields: addressFields,
        append: appendAddress,
        remove: removeAddress,
    } = useFieldArray({
        control,
        name: "addresses",
    });

    // Helper function to convert image to base64
    const imageToBase64 = async (file: File | Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleActualSubmit = async (data: Inputs) => {
        if (!initialData?.id) return;

        setIsSaving(true);
        try {
            // Build JSON payload
            const formData = new FormData();
            const payload: any = {
                user_detail: {
                    id: initialData?.user_detail?.id,
                    first_name: data.firstName,
                    last_name: data.lastName,
                    date_of_birth: data.date_of_birth,
                    gender: data.gender.charAt(0).toUpperCase() + data.gender.slice(1),
                },

                // Primary email (first marked as primary or first email)
                // email:
                //     data.emails?.find((e) => e.is_primary)?.email ||
                //     data.emails?.[0]?.email ||
                //     "",
                // Primary phone (first marked as primary or first phone)
                // phone_number: (
                //     data.phones?.find((p) => p.is_primary)?.phone ||
                //     data.phones?.[0]?.phone ||
                //     ""
                // ).replace("+", ""),
                // All emails as array of objects
                emails:
                    data.emails
                        ?.filter((e) => e.email)
                        ?.map((e) => ({
                            ...(e?.id && { id: e.id }),
                            email: e.email,
                            is_primary: e.is_primary || false,
                        })) || [],
                // All phones as array of objects
                phones:
                    data.phones
                        ?.filter((p) => p.phone)
                        ?.map((p) => ({
                            ...(p?.id && { id: p?.id }),
                            phone: p.phone,
                            is_primary: p.is_primary || false,
                        })) || [],
                addresses:
                    data.addresses
                        ?.filter(
                            (a) =>
                                a.address1 ||
                                a.address2 ||
                                a.country_iso ||
                                a.state_iso ||
                                a.city ||
                                a.pincode,
                        )
                        ?.map((address) => {
                            const country = Country.getCountryByCode(address.country_iso ?? "");
                            const subdivisions = address.country_iso
                                ? State.getStatesOfCountry(address.country_iso)
                                : [];
                            const stateTrimmed = (address.state_iso ?? "").trim();
                            const stateName = subdivisions.length > 0
                                ? subdivisions.find((s) => s.isoCode === stateTrimmed)?.name ?? stateTrimmed
                                : stateTrimmed;
                            const cities =
                                subdivisions.length > 0 && stateTrimmed
                                    ? City.getCitiesOfState(address.country_iso ?? "", stateTrimmed)
                                    : [];
                            const cityName = cities.length > 0 ? (address.city ?? "").trim() : address.city ?? "";

                            return {
                                ...(address?.id ? { id: address.id } : {}),
                                address_1: address.address1,
                                address_2: address.address2,
                                country: country?.name ?? address.country_iso ?? "",
                                state: stateName,
                                city: cityName,
                                pincode: address.pincode ?? "",
                                is_primary: address.is_primary || false,
                            };
                        }) || []
            };
            formData.append("data", JSON.stringify(payload));
            // Convert image to base64 if it's a new file
            if (image instanceof File) {
                formData.append("user_image", image);
            }

            await updatePersonalProfile(String(initialData.id), formData);

            toastSuccess(t("updatedToast"));
            useAuthStore.getState().patchUser({
                first_name: data.firstName?.trim() || undefined,
                last_name: data.lastName?.trim() || undefined,
            });
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Failed to update profile:", error);
            reportFormSubmitApiError(error, setError);
        } finally {
            setIsSaving(false);
        }
    };
    const watchedEmails = useWatch({ control, name: "emails" });
    const watchedPhones = useWatch({ control, name: "phones" });
    const watchedAddresses = useWatch({ control, name: "addresses" });
    const phoneCountry = usePhoneCountryFromAddresses(control);

    useImperativeHandle(ref, () => ({
        submit: () => handleSubmit(handleActualSubmit)(),
        isSaving,
    }), [isSaving, handleSubmit, handleActualSubmit]);
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
        <form
            className={`flex w-full flex-col pb-10 transition-opacity duration-500 ${isMounted ? "animate-in fade-in duration-500 opacity-100" : "opacity-0"}`}
            onSubmit={handleSubmit(handleActualSubmit)}
        >
            <div className="flex w-full flex-col rounded-xl border border-slate-200/90 bg-white px-5 py-2 dark:border-slate-700 dark:bg-slate-950 sm:px-8">
            {/* Header / Basic Info Summary */}
            <div className="flex w-full items-center gap-6 border-b border-slate-200/90 py-6 dark:border-slate-700/80">
                <ProfilePictureUploader
                    image={image}
                    setImage={setImage}
                    size={110}
                    readOnly={!isEditing}
                />
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        {initialData?.user_detail?.first_name || "Alex"}{" "}
                        {initialData?.user_detail?.last_name || "Morgan"}
                    </h1>
                    <div className="mt-1 flex gap-5">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Calendar size={16} />
                            <span className="text-[length:var(--dash-body-size,0.875rem)]">
                                Joined{" "}
                                {initialData?.created_at
                                    ? new Date(initialData.created_at).toLocaleDateString(
                                        "en-US",
                                        { month: "short", year: "numeric" },
                                    )
                                    : "Oct 2023"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Basic Information */}
            <FormSectionCard title={t("BasicInfo")} icon={<Calendar size={20} />}>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    <Input
                        label={t("FirstName")}
                        register={register("firstName")}
                        errors={errors.firstName}
                        readOnly={!isEditing}
                        fieldRequired
                    />
                    <Input
                        label={t("LastName")}
                        register={register("lastName")}
                        errors={errors.lastName}
                        readOnly={!isEditing}
                        fieldRequired
                    />
                    <Input
                        label={t("DateOfBirth")}
                        type="date"
                        register={register("date_of_birth")}
                        errors={errors.date_of_birth}
                        readOnly={!isEditing}
                    />
                    <Select
                        label={t("Gender")}
                        register={register("gender")}
                        readOnly={!isEditing}
                        options={[
                            { label: "Male", value: "male" },
                            { label: "Female", value: "female" },
                            { label: "Other", value: "other" },
                        ]}
                    />
                    <Input
                        label={t("Role")}
                        register={register("role")}
                        errors={errors.role}
                        readOnly={true}
                    />
                    <Input
                        label={t("JoiningDate")}
                        type="date"
                        register={register("joiningDate")}
                        errors={errors.joiningDate}
                        readOnly={!isEditing}
                    />
                </div>
            </FormSectionCard>

            {/* Contact Details */}
            <FormSectionCard title={t("ContactDetails")} icon={<Mail size={20} />}>
                <div className="flex flex-col gap-8">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="min-w-0 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <Mail size={14} aria-hidden className="shrink-0" />
                                    {t("Emails")}
                                </h3>
                                {isEditing && (
                                    <AppButton
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => appendEmail({ email: "", is_primary: false })}
                                        className="gap-2"
                                    >
                                        <Plus size={14} /> {t("AddEmail")}
                                    </AppButton>
                                )}
                            </div>
                            <div className="flex flex-col space-y-3">
                                {emailFields.map((field, index) => (
                                    <div key={field.id} className="group flex items-end gap-3">
                                        <div className="relative min-w-0 w-full">
                                            <Input
                                                register={register(`emails.${index}.email` as const)}
                                                placeholder="Enter email address"
                                                className="flex-1"
                                                readOnly={!isEditing}
                                            />
                                            {field?.is_primary ? (
                                              <p className="absolute right-2 top-2 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                {t("Primary")}
                                              </p>
                                            ) : null}
                                        </div>
                                        {isEditing && (
                                            <label className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-700 text-sm whitespace-nowrap">
                                                <input
                                                    type="radio"
                                                    name="email_primary"
                                                    checked={!!watchedEmails?.[index]?.is_primary}
                                                    onChange={() => {
                                                        emailFields.forEach((_, i) => {
                                                            setValue(`emails.${i}.is_primary`, i === index);
                                                        });
                                                    }}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                                <span className="text-slate-600 dark:text-slate-300">
                                                    {t("Primary")}
                                                </span>
                                            </label>
                                        )}
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
                        <div className="min-w-0 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <Phone size={14} aria-hidden className="shrink-0" />
                                    {t("Phones")}
                                </h3>
                                {isEditing && (
                                    <AppButton
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => appendPhone({ phone: "", is_primary: false })}
                                        className="gap-2"
                                    >
                                        <Plus size={14} /> {t("AddPhone")}
                                    </AppButton>
                                )}
                            </div>
                            <div className="space-y-3">
                                {phoneFields.map((field, index) => (
                                    <div key={field.id} className="group flex items-start gap-3">
                                        <div className="relative min-w-0 w-full">
                                            <SurfacePhoneField
                                                control={control}
                                                name={`phones.${index}.phone` as const}
                                                id={`phone-${index}`}
                                                label=""
                                                className="flex-1"
                                                disabled={!isEditing}
                                                countryIso={phoneCountry}
                                            />
                                            {field?.is_primary ? (
                                              <p className="absolute right-2 top-2 z-[1] rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                {t("Primary")}
                                              </p>
                                            ) : null}
                                        </div>

                                        {isEditing && (
                                            <label className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 dark:bg-slate-700 text-sm whitespace-nowrap mt-1.5">
                                                <input
                                                    type="radio"
                                                    name="phone_primary"
                                                    checked={!!watchedPhones?.[index]?.is_primary}
                                                    onChange={() => {
                                                        phoneFields.forEach((_, i) => {
                                                            setValue(`phones.${i}.is_primary`, i === index);
                                                        });
                                                    }}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                                <span className="text-slate-600 dark:text-slate-300">
                                                    {t("Primary")}
                                                </span>
                                            </label>
                                        )}
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
                    </div>
                    {/* Emails Section */}

                    <div className="h-px bg-slate-100 dark:bg-slate-700/50" />

                    {/* Addresses Section */}
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-[length:var(--dash-body-size,0.875rem)] font-semibold text-slate-900 dark:text-slate-100">
                                {t("Addresses")}
                            </h3>
                            {isEditing ? (
                                <AppButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                        appendAddress({
                                            address1: "",
                                            address2: "",
                                            country_iso: "",
                                            state_iso: "",
                                            city: "",
                                            pincode: "",
                                            is_primary: addressFields.length === 0,
                                        })
                                    }
                                >
                                    <Plus className="size-4" aria-hidden />
                                    {t("AddAddress")}
                                </AppButton>
                            ) : null}
                        </div>

                        <div className="space-y-0">
                            {addressFields.map((field, index) => {
                                const row = watchedAddresses?.[index];
                                const countryIso = row?.country_iso ?? "";
                                const searchContext = buildAddressSearchContext({
                                    countryIso,
                                    stateIso: row?.state_iso ?? "",
                                    city: row?.city ?? "",
                                    pincode: row?.pincode ?? "",
                                });
                                const rowIdPrefix = `profile-address-${index}`;

                                return (
                                    <div
                                        key={field.id}
                                        className="w-full space-y-4 border-b border-slate-100 py-5 first:pt-0 last:border-b-0 last:pb-0 dark:border-slate-800"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                {t("AddressN", { n: index + 1 })}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                {isEditing ? (
                                                    <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                        <input
                                                            type="radio"
                                                            name="address_primary"
                                                            checked={Boolean(row?.is_primary)}
                                                            onChange={() => {
                                                                addressFields.forEach((_, i) => {
                                                                    setValue(`addresses.${i}.is_primary`, i === index);
                                                                });
                                                            }}
                                                        />
                                                        {t("Primary")}
                                                    </label>
                                                ) : row?.is_primary ? (
                                                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                        {t("Primary")}
                                                    </span>
                                                ) : null}
                                                {isEditing && addressFields.length > 1 ? (
                                                    <AppButton
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => removeAddress(index)}
                                                    >
                                                        <Trash2 className="size-4" aria-hidden />
                                                        {t("RemoveAddress")}
                                                    </AppButton>
                                                ) : null}
                                            </div>
                                        </div>

                                        <FormFieldRow cols="1">
                                            <Controller
                                                control={control}
                                                name={`addresses.${index}.address1`}
                                                render={({ field: f }) => (
                                                    <FieldGroup
                                                        label={t("fields.address1")}
                                                        htmlFor={`${rowIdPrefix}-line1`}
                                                        required
                                                    >
                                                        <AddressPlaceAutocomplete
                                                            id={`${rowIdPrefix}-line1`}
                                                            value={f.value ?? ""}
                                                            onChange={(next) => {
                                                                f.onChange(sanitizeAddressInput(next));
                                                                setValue(`addresses.${index}.address1`, sanitizeAddressInput(next), {
                                                                    shouldDirty: true,
                                                                    shouldTouch: true,
                                                                    shouldValidate: true,
                                                                });
                                                            }}
                                                            onBlur={f.onBlur}
                                                            countryIso={countryIso}
                                                            contextCity={searchContext.city}
                                                            contextState={searchContext.state}
                                                            contextCountry={searchContext.country}
                                                            contextPincode={searchContext.pincode}
                                                            disabled={!isEditing}
                                                            onSelectPlace={(place) =>
                                                                applyPlaceToProfileAddress(setValue, index, place)
                                                            }
                                                            maxLength={FIELD_MAX_LENGTH.ADDRESS_LINE}
                                                        />
                                                    </FieldGroup>
                                                )}
                                            />
                                        </FormFieldRow>

                                        <FormFieldRow cols="1">
                                            <Controller
                                                control={control}
                                                name={`addresses.${index}.address2`}
                                                render={({ field: f }) => (
                                                    <FieldGroup
                                                        label={t("fields.address2")}
                                                        htmlFor={`${rowIdPrefix}-line2`}
                                                    >
                                                        <input
                                                            id={`${rowIdPrefix}-line2`}
                                                            autoComplete="address-line2"
                                                            className={cn(surfaceInputClassName, !isEditing && "bg-slate-50 dark:bg-slate-900/60")}
                                                            disabled={!isEditing}
                                                            maxLength={FIELD_MAX_LENGTH.ADDRESS_LINE}
                                                            value={f.value ?? ""}
                                                            onChange={(e) =>
                                                                f.onChange(sanitizeAddressInput(e.target.value))
                                                            }
                                                            onBlur={f.onBlur}
                                                        />
                                                    </FieldGroup>
                                                )}
                                            />
                                        </FormFieldRow>

                                        <CascadingLocationFields
                                            control={control}
                                            setValue={setValue}
                                            countryIsoName={`addresses.${index}.country_iso`}
                                            stateIsoName={`addresses.${index}.state_iso`}
                                            cityName={`addresses.${index}.city`}
                                            labels={{
                                                country: t("fields.country"),
                                                state: t("fields.state"),
                                                city: t("fields.city"),
                                            }}
                                            placeholders={{
                                                country: t("placeholders.country"),
                                                state: t("placeholders.state"),
                                                city: t("placeholders.city"),
                                            }}
                                            disabled={!isEditing}
                                            errors={{
                                                country: undefined,
                                                state: undefined,
                                                city: undefined,
                                            }}
                                            trailingSlot={
                                                <FieldGroup
                                                    label={t("fields.pincode")}
                                                    htmlFor={`${rowIdPrefix}-pincode`}
                                                    required
                                                >
                                                    <Controller
                                                        control={control}
                                                        name={`addresses.${index}.pincode`}
                                                        render={({ field: f }) => (
                                                            <input
                                                                id={`${rowIdPrefix}-pincode`}
                                                                autoComplete="postal-code"
                                                                maxLength={FIELD_MAX_LENGTH.PINCODE}
                                                                value={f.value ?? ""}
                                                                onChange={(e) =>
                                                                    f.onChange(
                                                                        sanitizeDigitsInput(
                                                                            e.target.value,
                                                                            FIELD_MAX_LENGTH.PINCODE,
                                                                        ),
                                                                    )
                                                                }
                                                                onBlur={f.onBlur}
                                                                disabled={!isEditing}
                                                                className={cn(
                                                                    surfaceInputClassName,
                                                                    !isEditing && "bg-slate-50 dark:bg-slate-900/60",
                                                                )}
                                                            />
                                                        )}
                                                    />
                                                </FieldGroup>
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </FormSectionCard>
            </div>
        </form>
    );
});

PersonalProfileForm.displayName = "PersonalProfileForm";

export default PersonalProfileForm;
