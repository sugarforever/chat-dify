import localFont from "next/font/local";
import "./globals.css";
import AuthProvider from "../components/AuthProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react"
import React from 'react';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <AuthProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen flex flex-col`}
        >
          <Navbar />
          <main className="flex-1 w-full mx-auto overflow-hidden">
            {children}
          </main>
          <Analytics />
        </body>
      </AuthProvider>
    </html>
  );
}
