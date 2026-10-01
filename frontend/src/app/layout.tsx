import type { Metadata,Viewport  } from "next";
import { DM_Sans, Libre_Baskerville, Cairo } from "next/font/google";
import { getServerStorageSnapshot } from "@/lib/storage/server";
import { StorageProvider } from "@/components/providers/storage-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { AppShell } from "@/components/layout/app-shell";
import "@/app/globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
});


export const metadata: Metadata = {

  title: "OpenManusWeb - Open Autonomous Agent",
  description: "Next-generation Web Interface for Autonomous AI Agents",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F0E" },
  ],
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
    <html lang={locale} data-theme={theme} suppressHydrationWarning className={`${dmSans.variable} ${libreBaskerville.variable}${cairo.variable}`}>
      <body
        data-sidebar={sidebarState}
        className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-manus-accent selection:text-white"
      >
        
        <StorageProvider cookieSnapshot={cookieSnapshot}>

          <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          >

            <I18nProvider>

              <AppShell>{children}</AppShell>

            </I18nProvider>

          </ThemeProvider>
        </StorageProvider>
      </body>
    </html>
  );
}