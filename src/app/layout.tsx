import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { BottomNav } from "@/components/bottom-nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CubaFinder — Marketplace y Mipymes de Cuba",
  description:
    "Busca productos, publica anuncios y encuentra mipymes en toda Cuba. Marketplace clasificado, directorio de negocios y buscador de ventas en grupos de Facebook.",
  keywords: [
    "ventas Cuba", "marketplace Cuba", "mipymes Cuba", "comprar vender Cuba",
    "grupos Facebook Cuba", "Ventas La Habana", "negocios Cuba", "directorios Cuba",
    "Revolico", "teléfono vendedor",
  ],
  authors: [{ name: "CubaFinder" }],
  openGraph: {
    title: "CubaFinder — Marketplace y Mipymes de Cuba",
    description: "Busca productos, publica anuncios y encuentra mipymes en toda Cuba.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <BottomNav />
        <div className="pb-16 md:pb-0">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
