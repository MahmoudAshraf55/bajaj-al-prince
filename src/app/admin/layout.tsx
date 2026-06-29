import type { Metadata } from "next";
import AdminSidebar from "@/components/AdminSidebar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ToastContext";

export const metadata: Metadata = {
  title: "Admin Portal | El Prince Bajaj",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main id="main-content" className="flex-1 min-h-screen overflow-auto pt-14 md:pt-0 focus:outline-none" tabIndex={-1}>
        <ErrorBoundary>
          <ToastProvider>{children}</ToastProvider>
        </ErrorBoundary>
      </main>
    </div>
  );
}
