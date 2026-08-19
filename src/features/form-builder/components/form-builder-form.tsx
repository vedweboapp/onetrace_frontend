"use client";

import React from "react";
import FormBuilder from "@/shared/form/formbuilder/FormBuilder";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { FormBuilderApiHandlers } from "@/shared/form/formbuilder/form-builder.handlers";

interface FormBuilderFormProps {
    activeModule?: string;
    /** Injectable API handlers forwarded to the shared FormBuilder. */
    apiHandlers?: FormBuilderApiHandlers;
    /** Project-type route id; forwarded to handlers via HandlerContext. */
    projectTypeId?: string;
    /** Close Route */
    BackUrl: string;
}

const FormBuilderForm = ({
    activeModule = "untitled module",
    apiHandlers,
    projectTypeId,
    BackUrl
}: FormBuilderFormProps) => {
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <DndProvider backend={HTML5Backend}>
                <FormBuilder
                    activeModule={activeModule}
                    apiHandlers={apiHandlers}
                    projectTypeId={projectTypeId}
                    BackUrl={BackUrl}
                />
            </DndProvider>
        </div>
    );
};

export default FormBuilderForm;