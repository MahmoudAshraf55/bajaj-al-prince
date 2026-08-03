import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { LanguageProvider } from "@/components/LanguageContext";
import ChatBot from "@/components/ChatBot";
import { getSiteLocale } from "@/lib/site-locale";

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getSiteLocale();

  return (
    <LanguageProvider scope="site" initialLanguage={locale.lang} initialDictionary={locale.dictionary}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatBot />
    </LanguageProvider>
  );
}
