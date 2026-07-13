import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { googleFontsHref } from "@/data/fonts";
import { StoreHydrator } from "@/components/StoreHydrator";
import { Onboarding } from "@/components/site/Onboarding";
import { BackToTop } from "@/components/site/BackToTop";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Asarayja Stream Overlays — Professional stream overlays in minutes",
  description:
    "Pick a template, fill in your channel profile once, and export overlays for OBS. Static and animated, with true alpha.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Mirrors next.config: Pages serves under /<repo>, the desktop build at root.
  const basePath = process.env.GITHUB_PAGES === "true" ? "/asarayja-streamoverlays" : "";
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* The standard set is bundled as local woff2 so it works offline (the
            desktop app's baseline). Relative src URLs inside the CSS resolve
            against its own path, so the same file works under the Pages basePath
            and at the desktop root. */}
        <link rel="stylesheet" href={`${basePath}/fonts/offline-fonts.css`} />
        {/* Any family not bundled locally streams from Google Fonts. With the
            whole catalogue bundled this is empty and skipped entirely. */}
        {googleFontsHref() && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={googleFontsHref()} />
          </>
        )}
      </head>
      <body className="min-h-full">
        <StoreHydrator />
        {children}
        <Onboarding />
        <BackToTop />
      </body>
    </html>
  );
}
