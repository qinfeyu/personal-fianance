import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LifeOrganizer — Personal Finance Dashboard",
  description:
    "Track your finances, tasks, habits and goals in one personal dashboard. Built with Next.js and Supabase.",
  keywords: ["personal finance", "budget tracker", "expense tracking", "monthly budget"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
