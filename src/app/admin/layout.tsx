import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Portal | El Prince Bajaj",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
