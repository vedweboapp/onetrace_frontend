"use client";

import React, { useLayoutEffect } from "react";
import FormFieldsSchema from "../formbuilder/FormFieldsSchema";
import { useDrag } from "react-dnd";
import { AppButton } from "@/shared/ui/app-button";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar.store";

// Must match dashboard-sidebar.tsx: md:w-50 = 200px, md:w-[42px] = 42px
const SIDEBAR_EXPANDED_W = 200;
const SIDEBAR_COLLAPSED_W = 42;

const DraggableAddButton: React.FC<{
  type: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
}> = ({ type, label, variant = "secondary" }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type,
    item: { type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag as any}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="cursor-move w-full"
    >
      <AppButton variant={variant} className="w-full justify-center">
        {label}
      </AppButton>
    </div>
  );
};

const ModuleBar: React.FC = () => {
  const sidebarOpen = useDashboardSidebarStore((s) => s.sidebarOpen);
  const sidebarW = sidebarOpen ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W;

  // Set CSS variable synchronously before paint so the transition
  // starts in the same frame as the sidebar's own CSS transition.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--modulebar-left",
      `${sidebarW}px`
    );
  }, [sidebarW]);

  return (
    <div
      className="fixed top-28 z-10 flex flex-col bg-white shadow-sm overflow-hidden"
      style={{
        left: "var(--modulebar-left, 200px)",
        width: 288,
        maxWidth: `calc(100vw - ${sidebarW}px)`,
        height: "calc(100vh - 7rem)",
        // Use the same transition timing as the sidebar (300ms ease)
        transition: "left 300ms ease, top 300ms ease",
      }}
    >
      {/* Scrollable field list */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-2 gap-2">
          {FormFieldsSchema?.map((item: any, index: number) => (
            <React.Fragment key={index}>
              {item.component}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Fixed bottom action buttons */}
      <div className="p-4 space-y-3 bg-white shrink-0">
        <DraggableAddButton type="ADD_SECTION" label="Add New Section" variant="secondary" />
        <DraggableAddButton type="ADD_SUBFORM" label="Add New Subform" variant="primary" />
      </div>
    </div>
  );
};

export default ModuleBar;
