import { create } from "zustand";
import type { ReactNode } from "react";

export type SnackbarVariant = "success" | "error";

export type SnackbarItem = {
  id: string;
  variant: SnackbarVariant;
  message: ReactNode;
  durationMs: number;
};

const MAX_QUEUED = 5;

type SnackbarState = {
  items: SnackbarItem[];
  push: (item: { variant: SnackbarVariant; message: ReactNode; durationMs?: number }) => string;
  dismiss: (id: string) => void;
};

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `snackbar-${idCounter}-${Date.now()}`;
}

export const useSnackbarStore = create<SnackbarState>((set) => ({
  items: [],
  push: ({ variant, message, durationMs = 4000 }) => {
    const id = nextId();
    set((s) => {
      const next = [...s.items, { id, variant, message, durationMs }];
      return {
        items: next.length > MAX_QUEUED ? next.slice(next.length - MAX_QUEUED) : next,
      };
    });
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));
