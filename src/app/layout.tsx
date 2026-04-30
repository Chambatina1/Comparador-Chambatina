import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CubaFinder — Buscador de ventas en grupos de Cuba",
  description:
    "Busca productos en grupos de Facebook de toda Cuba. Encuentra el mejor precio, teléfono del vendedor, provincia y fecha de publicación. Ventas La Habana, Ventas Pinar, Ventas Holguín y más.",
  keywords: [
    "ventas Cuba", "grupos Facebook Cuba", "Ventas La Habana", "Ventas Pinar",
    "mejor precio Cuba", "buscar productos Cuba", "Revolico",
    "marketplace Cuba", "comprar vender Cuba", "teléfono vendedor",
  ],
  authors: [{ name: "CubaFinder" }],
  openGraph: {
    title: "CubaFinder — Buscador de ventas en Cuba",
    description: "Busca en grupos de Facebook de toda Cuba. Precio, teléfono, ubicación y fecha.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
