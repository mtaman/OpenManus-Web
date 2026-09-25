import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "OpenManus Web Dashboard",
  description: "High-performance autonomous agent interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)] antialiased overflow-hidden">
        <I18nProvider>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}