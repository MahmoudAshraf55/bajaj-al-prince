'use client';

import { usePathname } from 'next/navigation';
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isHome = pathname === '/' || pathname === '';

  return (
    <>
      {!isHome && <Header />}
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
