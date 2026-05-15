"use client";
import React from 'react'
import CompanySettingsHeader from './company-settings-header';
import { useUrlParams } from '@/shared/hooks/use-url-params';
import OrganizationalDetail, { OrganizationalDetailRef } from './organizational-detail';

const CompanySettingsDetails = () => {
    const orgDetailRef = React.useRef<OrganizationalDetailRef>(null);
    const [isEditing, setIsEditing] = React.useState(false);
    const [params] = useUrlParams({ tab: "organization" });

    const handleSave = () => {
        if (params.tab === "organization") {
            orgDetailRef.current?.submit();
        }
    };

    return (
        <div className='flex flex-col gap-4 w-full'>
            <CompanySettingsHeader
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                onSave={handleSave}
                showEdit={params.tab === "organization"}
            />
            
            {params.tab === "organization" && (
                <OrganizationalDetail 
                    ref={orgDetailRef} 
                    isEditing={isEditing} 
                    onSaveSuccess={() => setIsEditing(false)}
                />
            )}

            {/* Other panels (Schedule, Currencies) will go here later */}
        </div>
    )
}

export default CompanySettingsDetails