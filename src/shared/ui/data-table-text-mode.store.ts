"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DataTableTextMode = "clip" | "wrap";

type State = {
  textMode: DataTableTextMode;
  setTextMode: (mode: DataTableTextMode) => void;
  toggleTextMode: () => void;
};

/** Shared preference: truncate (clip) vs wrap long cell text in entity tables. */
export const useDataTableTextModeStore = create<State>()(
  persist(
    (set, get) => ({
      textMode: "clip",
      setTextMode: (textMode) => set({ textMode }),
      toggleTextMode: () =>
        set({ textMode: get().textMode === "clip" ? "wrap" : "clip" }),
    }),
    { name: "onetrace.data-table-text-mode" },
  ),
);
