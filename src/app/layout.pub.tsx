import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Atelier — A Project Gallery",
  description:
    "A minimal, fullscreen-image-first template for showcasing graphical projects. Built with Next.js, Prisma, and shadcn/ui.",
  keywords: ["portfolio", "gallery", "atelier", "minimal", "fullscreen", "Next.js"],
  authors: [{ name: "Atelier" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Atelier — A Project Gallery",
    description: "A minimal, fullscreen-image-first template for showcasing graphical projects.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-background text-foreground font-sans`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
