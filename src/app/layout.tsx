import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FinanceTracker — Personal Budget Dashboard",
  description:
    "Track your monthly income, expenses, and savings with your personal finance dashboard. Built with Next.js and Supabase.",
  keywords: ["personal finance", "budget tracker", "expense tracking", "monthly budget"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased font-sans">{children}</body>
    </html>
  );
}
