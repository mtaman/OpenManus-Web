import type { Metadata } from "next";
import { getServerStorageSnapshot } from "@/lib/storage/server";
import { StorageProvider } from "@/components/providers/storage-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { AppShell } from "@/components/layout/app-shell";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "OpenManus Web",
  description: "Autonomous AI workbench",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieSnapshot = await getServerStorageSnapshot();
  const sidebarState = cookieSnapshot.sidebar_state ?? "expanded";
  const theme = cookieSnapshot.theme ?? "system";
  const locale = cookieSnapshot.locale ?? "en";

  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <body
        data-sidebar={sidebarState}
        className="min-h-screen bg-background text-foreground antialiased font-sans"
      >
        <StorageProvider cookieSnapshot={cookieSnapshot}>
          <ThemeProvider>
            <I18nProvider>
              <AppShell>{children}</AppShell>
            </I18nProvider>
          </ThemeProvider>
        </StorageProvider>
      </body>
    </html>
  );
}