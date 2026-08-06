import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageContext";
import { getSiteLocale } from "@/lib/site-locale";

export const metadata: Metadata = {
  title: "Book a Service | El Prince Bajaj — Motorcycle Maintenance",
  description: "Schedule your Bajaj motorcycle service appointment online. Professional maintenance, genuine parts, and expert diagnostics at El Prince Bajaj.",
};

export default async function BookingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getSiteLocale();

  return (
    <LanguageProvider scope="site" initialLanguage={locale.lang} initialDictionary={locale.dictionary}>
      {children}
    </LanguageProvider>
  );
}
