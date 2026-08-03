import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/app/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SimHo",
    template: "%s · SimHo",
  },
  description: "SimHo",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
