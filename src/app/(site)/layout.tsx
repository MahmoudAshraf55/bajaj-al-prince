import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { LanguageProvider } from "@/components/LanguageContext";
import ChatBot from "@/components/ChatBot";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LanguageProvider scope="site">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatBot />
    </LanguageProvider>
  );
}
