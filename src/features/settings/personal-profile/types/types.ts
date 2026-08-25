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
        date_of_birth?: string | null;
        user?: {
            email?: string;
            first_name?: string;
            last_name?: string;
            date_of_birth?: string | null;
            phone_number?: string | null;
            is_verified?: boolean;
        };
    };
    role_detail?: { role_name?: string };
    emails?: ContactEmail[];
    phones?: ContactPhone[];
    addresses?: ContactAddress[];
    created_at?: string;
    last_login?: string | null;
    appearance_settings?: {
        preferences?: Record<string, unknown>;
        available_options?: Record<string, unknown>;
    };
};
