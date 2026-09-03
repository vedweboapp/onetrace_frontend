import { AppButton, AppModal } from '@/shared/ui'
import { FaBuilding, FaUsers } from "react-icons/fa6";
import React, { useState } from 'react'
import { title } from 'process';
import { icon } from 'leaflet';

const CreateModuleModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const [selectedOption, setSelectedOption] = useState("")
    const options = [
        {
            icon: <FaBuilding className='text-blue-600' size={20} />,
            key: "organization",
            title: "Organization Modules",
            discription: "Organization Module can be used for all the user across the organization.",
            iconbg: "bg-blue-200 w-10 h-10 rounded-full flex items-center justify-center"
        },
        {
            icon: <FaUsers className='text-gray-600' size={20} />,
            title: "Team Modules",
            key: "team",
            discription: "Team Module will be used for a user or for a group of users and it will be specific to a teamspace.",
            iconbg: "bg-gray-200 w-10 h-10 rounded-full flex items-center justify-center"
        }
    ]
    return (
        <div>
            <AppModal open={open} onClose={onClose} size="2xl" title="Create Module" description="Select the module type that needs to be created for your organization.">
                <div className="flex flex-col gap-4">
                    {
                        options?.map((option, index) =>
                        (
                            <div className={`flex p-4 rounded border cursor-pointer  flex items-center gap-2 ${selectedOption === option?.key ? "border-blue-400 dark:border-blue-600" : "border-gray-200 dark:border-gray-700"} `} onClick={() => setSelectedOption(option?.key)}>
                                <div className={option?.iconbg}>
                                    {option?.icon}
                                </div>
                                <div className='flex flex-col gap-1'>
                                    <span className='text-lg font-semibold'>{option?.title}</span>
                                    <span className='text-sm text-gray-500'>{option?.discription}</span>
                                </div>
                            </div>
                        )
                        )
                    }
                </div>
                <div className='flex items-center justify-end'>
                    <div className='py-4 flex items-center gap-2'>
                        <AppButton
                            variant='secondaryLight'
                        >
                            close
                        </AppButton>
                        <AppButton>
                            NEXT
                        </AppButton>
                    </div>
                </div>

            </AppModal>
        </div>
    )
}

export default CreateModuleModal