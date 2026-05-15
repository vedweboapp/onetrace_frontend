"use client";
import { AppButton, AppTabs } from '@/shared/ui'
import React from 'react'
import { PersonalProfileHeaderTabKey } from '../../personal-profile/types/types'
import { useUrlParams } from '@/shared/hooks/use-url-params'

interface CompanySettingsHeaderProps {
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    onSave?: () => void;
    showEdit?: boolean;
}

const CompanySettingsHeader = ({ isEditing, setIsEditing, onSave, showEdit = true }: CompanySettingsHeaderProps) => {
    const [params, setParam] = useUrlParams({ tab: "organization" });

    const tabs: PersonalProfileHeaderTabKey[] = [
        { id: "organization", label: "ORGANIZATION DETAILS" },
        { id: "schedule", label: "SCHEDULE" },
        { id: "Currencies", label: "CURRENCIES" },
    ];

    return (
        <div className='flex items-center justify-between'>
            <AppTabs
                tabs={tabs}
                value={params.tab as string}
                onValueChange={(value) => setParam("tab", value)}
                className='w-full'
            />
            {showEdit && (
                <div className="flex items-center gap-2">
                    {isEditing && (
                        <AppButton
                            variant="primary"
                            onClick={onSave}
                        >
                            Save
                        </AppButton>
                    )}
                    <AppButton
                        variant={isEditing ? "ghost" : "primary"}
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        {isEditing ? "Close" : "Edit"}
                    </AppButton>
                </div>
            )}
        </div>
    )
}

export default CompanySettingsHeader