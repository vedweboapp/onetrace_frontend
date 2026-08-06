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
        <div className='sticky -top-5 sm:-top-6 z-20 flex items-center justify-between bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm pb-4 pt-5 sm:pt-6 border-b border-slate-200/60 dark:border-slate-800/80 mb-2 -mx-4 px-4 lg:-mx-6 lg:px-6 -mt-5 sm:-mt-6'>
            <AppTabs
                tabs={tabs}
                value={params.tab as string}
                onValueChange={(value) => setParam("tab", value)}
                className='w-full'
            />
            <div className="flex items-center gap-2">
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
                        // type="submit"
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
