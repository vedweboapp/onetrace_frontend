export type PersonalProfileHeaderTabKey = {
    id: string;
    label: string;
};
export type ContactEmail = { email: string };
export type ContactPhone = { phone: string; label?: string };
export type ContactAddress = {
    address: string;
    isPrimary?: boolean;
};


export type Inputs = {
    firstName: string;
    lastName: string;
    dob: string;
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
    // ... other top-level fields
};
