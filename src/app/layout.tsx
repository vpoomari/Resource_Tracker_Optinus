import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.optinus-solutions.com"),
  title: "Optinus Resource Management — Specialised Transformation Talent",
  description:
    "Optinus delivers specialised workforce solutions — track client demands, candidate pipelines, CV submissions, interviews, selections, onboarding, and demand closure.",
  keywords: [
    "Optinus",
    "Resource Management",
    "Demand Tracking",
    "Talent Transformation",
    "SAP Talent",
    "Recruitment",
    "Kanban",
    "Pipeline",
  ],
  authors: [{ name: "Optinus Solutions" }],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Optinus Resource Management",
    description: "Specialised Transformation Talent — Resource Demand & Candidate Tracking Platform",
    siteName: "Optinus",
    type: "website",
    images: [{ url: "/optinus-logo.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${nunito.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
