import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrecioFinder — Compara precios y ahorra",
  description:
    "Encuentra el mejor precio para cualquier producto comparando entre TikTok Shop, Amazon, AliExpress, SHEIN, Temu y MercadoLibre. Ahorra tiempo y dinero.",
  keywords: [
    "comparador de precios",
    "mejor precio",
    "TikTok Shop",
    "Amazon",
    "AliExpress",
    "SHEIN",
    "Temu",
    "MercadoLibre",
    "ofertas",
    "ahorro",
  ],
  authors: [{ name: "PrecioFinder" }],
  openGraph: {
    title: "PrecioFinder — Compara precios y ahorra",
    description:
      "Busca cualquier producto y compara precios en 6 plataformas al mismo tiempo.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrecioFinder — Compara precios y ahorra",
    description:
      "Busca cualquier producto y compara precios en 6 plataformas al mismo tiempo.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
