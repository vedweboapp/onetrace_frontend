import { AppButton } from '@/shared/ui';
import { Pencil, Trash, VectorSquare } from 'lucide-react';
import React from 'react'
import { cn } from '@/core/utils/http.util';

interface PlotToolbarProps {
    onEditPolygon: () => void;
    onRename: () => void;
    onDelete: () => void;
    isEditing?: boolean;
}

const PlotToolbar = ({ onEditPolygon, onRename, onDelete, isEditing }: PlotToolbarProps) => {
    const plotTools = [
        {
            id: 'edit',
            tooltip: "Edit Polygon",
            icons: <VectorSquare className='size-5' />,
            onToolClick: onEditPolygon,
            isActive: isEditing
        },
        {
            id: 'rename',
            tooltip: "Rename",
            icons: <Pencil className='size-5' />,
            onToolClick: onRename,
            isActive: false
        },
        // {
        //     id: 'delete',
        //     tooltip: "Delete",
        //     icons: <Trash className='size-5' />,
        //     onToolClick: onDelete,
        //     isActive: false
        // }
    ]

    return (
        <div className="flex gap-2.5 rounded-2xl bg-white px-3 py-2 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            {plotTools.map((tool) => (
                <AppButton
                    key={tool.id}
                    type="button"
                    size="sm"
                    variant={tool.isActive ? "primary" : "secondary"}
                    className={cn(
                        "h-11 px-4 font-bold transition-all duration-200",
                        !tool.isActive && "hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                    onClick={tool.onToolClick}
                    title={tool.tooltip}
                >
                    {tool.icons}
                </AppButton>
            ))}
        </div>
    )
}

export default PlotToolbar