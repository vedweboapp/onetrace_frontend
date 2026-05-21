"use client";
import { AppButton, AppTabs } from '@/shared/ui'
import React from 'react'
import { PersonalProfileHeaderTabKey } from '../types/types'
import { useUrlParams } from '@/shared/hooks/use-url-params'

interface PersonalProfileHeaderProps {
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    showEdit?: boolean;
}

const PersonalProfileHeader = ({ isEditing, setIsEditing, showEdit = true }: PersonalProfileHeaderProps) => {
    const [params, setParam] = useUrlParams({ tab: "profile" });

    const tabs: PersonalProfileHeaderTabKey[] = [
        { id: "profile", label: "PERSONAL PROFILE" },
        { id: "appearance", label: "APPEARANCE" },
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
                <AppButton
                    variant={isEditing ? "ghost" : "primary"}
                    onClick={() => setIsEditing(!isEditing)}
                >
                    {isEditing ? "Close" : "Edit"}
                </AppButton>
            )}
        </div>
    )
}

export default PersonalProfileHeader;
