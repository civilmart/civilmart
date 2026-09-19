import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/site-settings";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  let siteName = "Civil Mart";
  let siteDescription =
    "Building materials, tools and hardware for every project — order online and pay on delivery.";
  let faviconUrl = "";
  let faviconPng16 = "";
  let faviconApple = "";

  try {
    const settings = await getSiteSettings();
    siteName = settings.siteName || siteName;
    siteDescription = settings.siteDescription || siteDescription;
    faviconUrl = settings.favicons.icon;
    faviconPng16 = settings.favicons.png16;
    faviconApple = settings.favicons.apple;
  } catch {
    // Fall back to defaults when settings are unavailable.
  }

  return {
    title: siteName,
    description: siteDescription,
    icons: {
      icon: faviconUrl || undefined,
      shortcut: faviconPng16 || undefined,
      apple: faviconApple || undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}