import { useDrag } from 'react-dnd';
import { LucideIcon } from 'lucide-react';

interface DraggableFieldButtonProps {
  type: string;
  icon: LucideIcon | any;
  label: string;
}

export default function DraggableFieldButton({ type, icon: Icon, label }: DraggableFieldButtonProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'FIELD',
    item: { type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div ref={drag as any} style={{ opacity: isDragging ? 0.5 : 1 }} className="cursor-move">
      <button className="flex items-center px-2 gap-2 py-3 border border-gray-300 bg-white rounded hover:bg-gray-50 hover:border-gray-400 transition-all text-left w-full">
        <Icon size={18} className="text-gray-600" />
        <span className="text-gray-700 font-medium truncate text-sm">{label}</span>
      </button>
    </div>
  );
}