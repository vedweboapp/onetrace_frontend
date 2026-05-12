"use client";

import { ThemeProvider as NextThemesProvider } from "@teispace/next-themes";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function ThemeProvider({ children }: Props) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="SimHo-ui-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
