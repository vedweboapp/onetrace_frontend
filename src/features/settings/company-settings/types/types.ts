export interface OrganizationDetails {
    id: number;
    logo: string | null | File;
    name: string;
    size: string;
    description: string;
    website: string;
    timezone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export interface UpdateOrganizationRequest extends Omit<OrganizationDetails, 'id'> {}
