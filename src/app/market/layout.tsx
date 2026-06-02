import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market | El Prince Bajaj — Genuine Parts & Motorcycles",
  description: "Browse genuine Bajaj motorcycles, spare parts, and accessories. Shop with confidence at El Prince Bajaj authorized service center.",
};

export default function MarketLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
