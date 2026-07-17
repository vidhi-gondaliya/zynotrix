import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { ThemeInit } from "@/components/layout/ThemeInit";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZYNOTRIX — Smart Workspace",
  description: "AI-powered task management and team collaboration platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakartaSans.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <ThemeInit />
        <SessionProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--bg-card)",
                color: "var(--text-foreground)",
                border: "1px solid var(--border-strong)",
                borderRadius: "12px",
                fontSize: "13px",
                fontFamily: "var(--font-body)",
                boxShadow: "var(--shadow-float)",
                padding: "12px 16px",
              },
              success: { iconTheme: { primary: "#22C55E", secondary: "#fff" } },
              error:   { iconTheme: { primary: "#F43F5E", secondary: "#fff" } },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
