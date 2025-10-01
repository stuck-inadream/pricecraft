// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import type * as React from "react";

// Use Next's built-in Google fonts (reliable in Next 15)
import { Inter } from "next/font/google";
import { Roboto_Mono } from "next/font/google";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});
const mono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pricecraft",
  description: "From competitor pricing to actionable experiments.",
  icons: { icon: "/convex.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="antialiased">
        <ConvexClientProvider>
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid #222",
              position: "sticky",
              top: 0,
              background: "var(--bg, #0b0b0b)",
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 700, letterSpacing: 0.3 }}>Pricecraft</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              From competitor pricing → experiments
            </div>
          </header>

          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
