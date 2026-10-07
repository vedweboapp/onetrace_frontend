"use client";

import React, { useLayoutEffect } from "react";
import FormFieldsSchema from "../formbuilder/FormFieldsSchema";
import { useDrag } from "react-dnd";
import { AppButton } from "@/shared/ui/app-button";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar.store";
import { useDashboardAppearanceStore } from "@/features/settings/personal-profile/store/dashboard-appearance.store";

// Must match dashboard-sidebar.tsx: md:w-56 = 224px, md:w-14 = 56px
const SIDEBAR_EXPANDED_W = 224;
const SIDEBAR_COLLAPSED_W = 56;

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
  const sidebarLayout = useDashboardAppearanceStore((s) => s.sidebarLayout);
  const sidebarOpen = useDashboardSidebarStore((s) => s.sidebarOpen);
  const isLeftSidebar = sidebarLayout === "lithium";
  const isHydrogen = sidebarLayout === "hydrogen";

  const sidebarW = isLeftSidebar ? (sidebarOpen ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W) : 0;
  const modulebarTop = isHydrogen ? 156 : 112;

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
      document.documentElement.style.setProperty(
        "--modulebar-top",
        `${modulebarTop}px`
      );
    }
  }, [sidebarW, modulebarTop, isLargeScreen]);

  // Ref for the mobile bar — we measure its height so FormBuilder can add a
  // matching spacer and content isn't hidden underneath this fixed element.
  const mobileBarRef = React.useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (isLargeScreen) return;
    const el = mobileBarRef.current;
    if (!el) return;
    const sync = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--mobile-modulebar-h", `${h}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLargeScreen]);

  // Mobile / Tablet View: fixed horizontal chip bar — uses the same CSS vars as the
  // sub-header so it's viewport-relative and unaffected by page padding.
  if (!isLargeScreen) {
    return (
      <div
        ref={mobileBarRef}
        className="fixed z-10 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-3 py-2 flex flex-col gap-1.5 overflow-hidden"
        style={{
          // Sit directly below the fixed sub-header
          top: "calc(var(--subheader-top, 56px) + var(--mobile-subheader-h, 148px))",
          left: "var(--subheader-left-w, 0px)",
          right: "var(--subheader-right-w, 0px)",
          transition: "left 300ms cubic-bezier(0.4,0,0.2,1), right 300ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Available Fields (Scroll &amp; Drag/Tap to Add)
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar scroll-smooth">
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
      className="fixed z-10 flex flex-col bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-900/50 border-r border-gray-200 dark:border-slate-700 overflow-hidden"
      style={{
        top: "var(--modulebar-top, 112px)",
        left: "var(--modulebar-left, 200px)",
        width: 288,
        height: "calc(100vh - var(--modulebar-top, 112px))",
        transition: "left 300ms cubic-bezier(0.4,0,0.2,1), top 300ms cubic-bezier(0.4,0,0.2,1)",
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