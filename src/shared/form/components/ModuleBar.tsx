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
      <AppButton variant={variant} className="w-full justify-center text-[12px] h-9 py-1 px-2">
        {label}
      </AppButton>
    </div>
  );
};

const ModuleBar: React.FC = () => {
  const sidebarOpen = useDashboardSidebarStore((s) => s.sidebarOpen);
  const sidebarW = sidebarOpen ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W;

  const [isLargeScreen, setIsLargeScreen] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    setIsLargeScreen(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useLayoutEffect(() => {
    if (isLargeScreen) {
      document.documentElement.style.setProperty(
        "--modulebar-left",
        `${sidebarW}px`
      );
    }
  }, [sidebarW, isLargeScreen]);

  // Mobile / Tablet View: Horizontal scroll list of fields
  if (!isLargeScreen) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-3 py-2 flex flex-col gap-1.5 shrink-0 overflow-hidden">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Available Fields (Scroll & Drag/Tap to Add)
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar w-full scroll-smooth">
          {/* Add New Section button first */}
          <div className="flex-shrink-0 w-32">
            <DraggableAddButton type="ADD_SECTION" label="+ Section" variant="primary" />
          </div>
          {FormFieldsSchema?.map((item: any, index: number) => (
            <div key={index} className="flex-shrink-0 w-28">
              {item.component}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop View (Matches original)
  return (
    <div
      className="fixed top-28 z-10 flex flex-col bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-900/50 border-r border-gray-200 dark:border-slate-700 overflow-hidden"
      style={{
        left: "var(--modulebar-left, 200px)",
        width: 288,
        maxWidth: `calc(100vw - ${sidebarW}px)`,
        height: "calc(100vh - 7rem)",
        transition: "left 300ms ease, top 300ms ease",
      }}
    >
      {/* Scrollable field list */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid gap-2 grid-cols-2">
          {FormFieldsSchema?.map((item: any, index: number) => (
            <React.Fragment key={index}>
              {item.component}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Fixed bottom action buttons */}
      <div className="p-4 space-y-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 shrink-0">
        <DraggableAddButton type="ADD_SECTION" label="Add New Section" variant="primary" />
      </div>
    </div>
  );
};

export default ModuleBar;