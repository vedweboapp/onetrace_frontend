"use client";

import FormBuilderForm from '@/features/form-builder/components/form-builder-form'
import React from 'react'
import { useParams } from "next/navigation";
import { projectFormHandlers } from "../api/project-form.handlers";

export const CreateProjectTypeForm = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <div>
            <FormBuilderForm
                activeModule="project-form"
                apiHandlers={projectFormHandlers}
                projectTypeId={id}
            />
        </div>
    )
}
