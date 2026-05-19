"use client";
import React, { useEffect, useState } from 'react';
import CompanySettingsHeader from './company-settings-header';
import { useUrlParams } from '@/shared/hooks/use-url-params';
import OrganizationalDetail, { OrganizationalDetailRef } from './organizational-detail';

import CompanySettingsCurrency from './company-settings-currency';
import CompanySettingSchedule from './company-setting-schedule';
import { getOrganizationDetails } from '../api/company-settings.api';
import { OrganizationDetails } from '../types/types';

const defaultOrgDetails: OrganizationDetails = {
    id: 1,
    logo: "",
    name: "OneTrace",
    size: "1-10",
    description: "Company details",
    website: "https://onetrace.com",
    timezone: "UTC",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    currencyCode: "INR",
    currencyName: "Indian Rupee",
    formatType: "symbol",
    symbol: "₹",
    symbolPosition: "before",
    digitSeparator: "1,234,567.89",
    decimalPlaces: 2,
    startTime: "09:00",
    endTime: "17:00",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    breakDuration: "30 minutes",
};

const CompanySettingsDetails = () => {
    const orgDetailRef = React.useRef<OrganizationalDetailRef>(null);
    const [isEditing, setIsEditing] = React.useState(false);
    const [params] = useUrlParams({ tab: "organization" });

    const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrgDetails = async () => {
        try {
            setIsLoading(true);
            const data = await getOrganizationDetails(1);
            setOrgDetails(data);
        } catch (error) {
            console.error("Failed to fetch organization details, using fallback details:", error);
            setOrgDetails(defaultOrgDetails);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgDetails();
    }, []);

    const handleSave = () => {
        if (params.tab === "organization") {
            orgDetailRef.current?.submit();
        }
    };

    const handleUpdateSuccess = (updatedData?: OrganizationDetails) => {
        if (updatedData) {
            setOrgDetails(updatedData);
        } else {
            fetchOrgDetails();
        }
        setIsEditing(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20 w-full">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-4 w-full'>
            <CompanySettingsHeader
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                onSave={handleSave}
                showEdit={params.tab === "organization"}
            />
            
            {params.tab === "organization" && orgDetails && (
                <OrganizationalDetail 
                    ref={orgDetailRef} 
                    isEditing={isEditing} 
                    initialData={orgDetails}
                    onSaveSuccess={handleUpdateSuccess}
                />
            )}

            {params.tab === "currencies" && orgDetails && (
                <CompanySettingsCurrency 
                    initialData={orgDetails} 
                    onSaveSuccess={handleUpdateSuccess}
                />
            )}

            {params.tab === "schedule" && orgDetails && (
                <CompanySettingSchedule 
                    initialData={orgDetails} 
                    onSaveSuccess={handleUpdateSuccess}
                />
            )}
        </div>
    )
}

export default CompanySettingsDetails