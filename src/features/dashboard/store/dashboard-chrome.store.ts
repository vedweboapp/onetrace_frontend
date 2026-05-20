"use client";

import type { ReactNode } from "react";
import { create } from "zustand";

type DashboardChromeState = {
  secondaryRow: ReactNode | null;
  setSecondaryRow: (node: ReactNode | null) => void;
};

export const useDashboardChromeStore = create<DashboardChromeState>((set) => ({
  secondaryRow: null,
  setSecondaryRow: (secondaryRow) => set({ secondaryRow }),
}));
