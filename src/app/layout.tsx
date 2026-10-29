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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Arimo:wght@400;700&family=Carlito:wght@400;700&family=Comic+Neue:wght@400;700&family=Cousine:wght@400;700&family=EB+Garamond:wght@400;600&family=Fira+Code:wght@400;600&family=Gelasio:wght@400;600&family=Inter:wght@400;500;600;700&family=Lato:wght@400;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Merriweather:wght@400;700&family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Tinos:wght@400;700&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
