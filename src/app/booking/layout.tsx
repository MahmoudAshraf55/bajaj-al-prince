import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Service | El Prince Bajaj — Motorcycle Maintenance",
  description: "Schedule your Bajaj motorcycle service appointment online. Professional maintenance, genuine parts, and expert diagnostics at El Prince Bajaj.",
};

export default function BookingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
