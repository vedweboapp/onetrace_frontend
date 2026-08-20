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
    currencyCode?: string;
    currencyName?: string;
    formatType?: string;
    symbol?: string;
    symbolPosition?: string;
    digitSeparator?: string;
    decimalPlaces?: number;
    numberFormat?: string;
    startTime?: string;
    endTime?: string;
    workingDays?: string[];
    breakDuration?: string;
}

export interface UpdateOrganizationRequest extends Omit<OrganizationDetails, 'id'> {}
