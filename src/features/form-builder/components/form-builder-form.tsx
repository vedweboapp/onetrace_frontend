"use client";

import React from "react";
import FormBuilder from "@/shared/form/formbuilder/FormBuilder";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

interface FormBuilderFormProps {
    activeModule?: string;
}

const FormBuilderForm = ({ activeModule = "untitled module" }: FormBuilderFormProps) => {
    return (
        <div>
            <DndProvider backend={HTML5Backend}>
                <FormBuilder activeModule={activeModule} />
            </DndProvider>
        </div>
    );
};

export default FormBuilderForm;