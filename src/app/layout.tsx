import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageContext";
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
  title: "El Prince Bajaj | Trusted Bajaj Motorcycle Service Center",
  description: "Your trusted destination for Bajaj motorcycle sales, maintenance, genuine parts, and diagnostics. Serving riders with passion and expertise since 2019.",
  openGraph: {
    title: "El Prince Bajaj | Trusted Bajaj Motorcycle Service Center",
    description: "Your trusted destination for Bajaj motorcycle sales, maintenance, genuine parts, and diagnostics.",
    url: BASE_URL,
    siteName: "El Prince Bajaj",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "El Prince Bajaj | Trusted Bajaj Motorcycle Service Center",
    description: "Your trusted destination for Bajaj motorcycle sales, maintenance, genuine parts, and diagnostics.",
  },
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
        <LanguageProvider>
          {children}
          <ChatBot />
        </LanguageProvider>
      </body>
    </html>
  );
}
