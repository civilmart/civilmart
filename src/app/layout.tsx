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
  let siteName = "NaranScents";

  try {
    const settings = await getSiteSettings();
    siteName = settings.siteName || siteName;
  } catch {
    // Fall back to default when settings are unavailable.
  }

  return {
    title: siteName,
    description: "Fragrance Management System",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}