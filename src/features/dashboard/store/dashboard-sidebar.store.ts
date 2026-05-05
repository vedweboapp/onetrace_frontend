import { create } from "zustand";

type State = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
};

export const useDashboardSidebarStore = create<State>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
