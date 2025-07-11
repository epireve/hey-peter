import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "sonner";
// import PerformanceProvider from "@/components/providers/PerformanceProvider";
// import { AppErrorBoundary, ErrorRecoveryProvider } from "@/components/error-boundary";
// import { error, info } from "@/lib/services";

export const metadata: Metadata = {
  title: "HeyPeter Academy",
  description: "Language learning management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
