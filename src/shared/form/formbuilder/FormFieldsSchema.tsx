import { FormFieldsConfig } from './FormInputFields';
import { FieldButton } from './FormInputFields';
import { useDrag } from 'react-dnd';
import React from 'react';

interface DraggableFieldProps {
  type: string;
  children: React.ReactNode;
}

// Draggable Field
const DraggableField: React.FC<DraggableFieldProps> = ({ type, children }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'FIELD',
    item: { type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag as any}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="cursor-move transition-transform hover:scale-105"
    >
      {children}
    </div>
  );
};

export interface FormFieldSchemaItem {
  type: string;
  label?: string;
  component: React.ReactNode;
}

// Build field list — Add Section/Subform buttons live in ModuleBar footer, not here
const fieldItems: FormFieldSchemaItem[] = FormFieldsConfig.map(field => ({
  type: field.type.replace('-text', '-line'),
  label: field.label,
  component: (
    <DraggableField type={field.type.replace('-text', '-line')}>
      <FieldButton icon={field.icon} label={field.label} />
    </DraggableField>
  ),
}));

const FormFieldsSchema: FormFieldSchemaItem[] = [...fieldItems];

export default FormFieldsSchema;