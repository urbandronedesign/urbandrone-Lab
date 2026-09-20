import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import { SiteProvider } from "@/components/SiteProvider";
import { getSite, siteTitle } from "@/lib/site";

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

// Site name, description etc. come from the database (edited at /admin/site).
// In the static export this runs once at build time.
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  const title = siteTitle(site);
  return {
    title,
    description: site.description,
    keywords: site.keywords.length ? site.keywords : undefined,
    authors: site.author ? [{ name: site.author }] : undefined,
    metadataBase: site.url ? new URL(site.url) : undefined,
    icons: {
      icon: [
        { url: "/logo.svg", type: "image/svg+xml" },
        { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/apple-icon.png",
    },
    openGraph: {
      title,
      description: site.description,
      type: "website",
      siteName: site.name,
      url: site.url || undefined,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: site.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: site.description,
      images: ["/og.png"],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSite();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-background text-foreground font-sans`}
      >
        <SiteProvider site={site}>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </SiteProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
