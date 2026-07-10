import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { googleFontsHref } from "@/data/fonts";
import { StoreHydrator } from "@/components/StoreHydrator";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Asarayja Stream Overlays — Professional stream overlays in minutes",
  description:
    "Pick a template, fill in your channel profile once, and export overlays for OBS. Static and animated, with true alpha.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Loaded document-wide rather than through next/font: Konva paints text
            onto a canvas and can only use families the document has loaded. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={googleFontsHref()} />
      </head>
      <body className="min-h-full">
        <StoreHydrator />
        {children}
      </body>
    </html>
  );
}
