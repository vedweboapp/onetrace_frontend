export type PersonalProfileHeaderTabKey = {
    id: string;
    label: string;
};
export type ContactEmail = { email: string; is_primary?: boolean; id?:string | number };
export type ContactPhone = { phone: string; label?: string; is_primary?: boolean; id?: string| number };
export type ContactAddress = {
    id?: string | number;
    address1: string;
    address2?: string;
    country_iso?: string;
    state_iso?: string;
    city?: string;
    pincode?: string;
    is_primary?: boolean;
};


export type Inputs = {
    firstName: string;
    lastName: string;
    date_of_birth: string;
    id?: number;
    gender: string;
    role: string;
    joiningDate: string;
    emails: ContactEmail[];
    phones: ContactPhone[];
    addresses: ContactAddress[];
};

export type PersonalProfileResponse = {
    id: string;
    user_detail: {
        id: string;
        gender?: string;
        user_image?: string | null;
        user_description?: string | null;
        phone_number?: string | null;
        secondary_phone?: string | null;
        tertiary_phone?: string | null;
        first_name?: string;
    last_name?: string;
    user?: {
            email?: string;
            first_name?: string;
            last_name?: string;
            date_of_birth?: string | null;
            phone_number?: string | null; // This might be different from user_detail.phone_number, handle carefully
            is_verified?: boolean;
        };
    };
    created_at?: string;
    last_login?: string | null;
    appearance_settings?: {
        preferences?: {
            font?: { size?: string; family?: string };
            accent?: {
                type?: "preset" | "custom";
                preset_id?: string;
                custom_hex?: string;
            };
            language?: string;
            theme_mode?: "light" | "dark";
            error_message?: {
                color_mode?: "default" | "custom";
                custom_hex?: string;
            };
            dashboard_layout?: string;
            page_label_position?: string;
            mandatory_field_display?: string;
        };
        available_options?: Record<string, unknown>;
    };
    // ... other top-level fields
};
