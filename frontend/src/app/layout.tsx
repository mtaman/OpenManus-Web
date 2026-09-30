import type { Metadata, Viewport } from "next";
import { DM_Sans, Libre_Baskerville, Cairo } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { AppShell } from "@/components/layout/app-shell";

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
  title: "Open Manus - Open Autonomous Agent",
  description: "Next-generation Web Interface for Autonomous AI Agents",
  icons: {
    icon: [
      { url: "/favicon.ico" }, 
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F0E" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${libreBaskerville.variable} ${cairo.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-manus-accent selection:text-white">
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
      </body>
    </html>
  );
}
