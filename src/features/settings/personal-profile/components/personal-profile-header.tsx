"use client";
import { AppButton, AppTabs } from '@/shared/ui'
import React from 'react'
import { PersonalProfileHeaderTabKey } from '../types/types'
import { useUrlParams } from '@/shared/hooks/use-url-params'

interface PersonalProfileHeaderProps {
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    showEdit?: boolean;
    submitHandler: () => void;
    isSaving : boolean;
}

const PersonalProfileHeader = ({ isEditing, setIsEditing, showEdit = true, submitHandler, isSaving }: PersonalProfileHeaderProps) => {
    const [params, setParam] = useUrlParams({ tab: "profile" });

    const tabs: PersonalProfileHeaderTabKey[] = [
        { id: "profile", label: "PERSONAL PROFILE" },
        { id: "appearance", label: "APPEARANCE" },
    ];

    return (
        <div className="sticky -top-5 z-20 flex items-center justify-between gap-3 bg-slate-50/95 px-0 pb-0 pt-5 backdrop-blur-sm sm:-top-6 sm:-mt-6 sm:pt-6 dark:bg-slate-950/95">
            <AppTabs
                tabs={tabs}
                value={params.tab as string}
                onValueChange={(value) => setParam("tab", value)}
                className="min-w-0 flex-1"
            />
            <div className="flex shrink-0 items-center gap-2 self-center pb-1.5">
            {showEdit && (
                <AppButton
                    variant={isEditing ? "ghost" : "primary"}
                    onClick={() => setIsEditing(!isEditing)}
                >
                    {isEditing ? "Close" : "Edit"}
                </AppButton>
            )}

            {
                isEditing && (
                    <AppButton
                        variant="primary"
                        size="sm"
                        onClick={submitHandler}
                        disabled={isSaving}
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </AppButton>
            
                )
            }
            </div>

        </div>
    )
}

export default PersonalProfileHeader;
