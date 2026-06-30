import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageContext";
import { SettingsProvider } from "@/components/SettingsContext";
import ChatBot from "@/components/ChatBot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "El Prince Bajaj | Trusted Bajaj Motorcycle Service Center",
  description: "Your trusted destination for Bajaj motorcycle sales, maintenance, genuine parts, and diagnostics. Serving riders with passion and expertise since 2019.",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "El Prince Bajaj | Trusted Bajaj Motorcycle Service Center",
    description: "Your trusted destination for Bajaj motorcycle sales, maintenance, genuine parts, and diagnostics.",
    url: BASE_URL,
    siteName: "El Prince Bajaj",
    type: "website",
    locale: 'ar_EG',
  },
  twitter: {
    card: "summary_large_image",
    title: "El Prince Bajaj | Trusted Bajaj Motorcycle Service Center",
    description: "Your trusted destination for Bajaj motorcycle sales, maintenance, genuine parts, and diagnostics.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AutoRepair',
  name: 'El Prince Bajaj',
  description: 'Trusted Bajaj motorcycle service center for sales, maintenance, genuine parts, and diagnostics.',
  url: BASE_URL,
  telephone: '+20-100-000-0000',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'EG',
    addressRegion: 'Cairo',
  },
  areaServed: 'Egypt',
  openingHours: 'Mo-Sa 09:00-21:00',
  priceRange: '$$',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-xl">
          Skip to content
        </a>
        <LanguageProvider>
          <SettingsProvider>
            {children}
            <ChatBot />
          </SettingsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
