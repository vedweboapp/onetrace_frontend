"use client";

import FormBuilderForm from '@/features/form-builder/components/form-builder-form'
import React from 'react'
import { useParams } from 'next/navigation'

const CreateLayoutForm = () => {
    const { id } = useParams<{ id: string }>()
    return (
        <div>
            <FormBuilderForm BackUrl={`/dashboard/settings/modules/${id}`} />
        </div>
    )
}

export default CreateLayoutForm