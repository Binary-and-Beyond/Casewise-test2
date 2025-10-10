import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casewise",
  description: "AI-powered medical case learning platform",
  generator: "Casewise",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
