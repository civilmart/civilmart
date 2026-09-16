"use client";

import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { CommandPalette } from "@/components/command-palette";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <Toaster position="top-right" richColors closeButton />
        <CommandPalette />

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background px-6">
            <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
