"use client"
import { useEffect, useState } from 'react';
import PersonalProfileHeader from './personal-profile-header';
import PersonalProfileForm from './personal-profile-form';
import { useUrlParams } from '@/shared/hooks/use-url-params';
import { AppearancePanel } from './appearance-panel';
import { fetchPersonalProfile } from '../api/personal-profile.api';
import { useAuthStore } from '@/features/auth/store/auth.store';

const PersonalProfileDetails = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [params, setParam] = useUrlParams({ tab: "profile" });
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const user = useAuthStore((state) => state.user);

    const getProfile = async () => {
        const id = user?.id;
        if (id) {
            setLoading(true);
            try {
                const data = await fetchPersonalProfile(String(id));
                setProfileData(data);
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    };

    useEffect(() => {
        getProfile();
    }, [user?.id]);

    const handleSuccess = () => {
        setIsEditing(false); // Turn off edit mode
        getProfile(); // Refresh data
    };

    return (
        <div className='flex flex-col gap-4 w-full'>
            <PersonalProfileHeader 
                isEditing={isEditing} 
                setIsEditing={setIsEditing} 
                showEdit={params.tab === "profile"} 
            />
            {
                params.tab === "profile" ? (
                    <PersonalProfileForm 
                        isEditing={isEditing} 
                        initialData={profileData} 
                        isLoading={loading} 
                        onSuccess={handleSuccess}
                    />
                ) : (
                    <AppearancePanel />
                )
            }
        </div>
    )
}

export default PersonalProfileDetails;

