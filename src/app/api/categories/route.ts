import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROXY_URLS = [
  process.env.PROXY_URL,
  "https://blind-workstation-trucks-hired.trycloudflare.com",
].filter(Boolean);

export async function GET() {
  for (const base of PROXY_URLS) {
    try {
      const res = await fetch(`${base}/categories`, {
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {}
  }
  return NextResponse.json([
    { id: "tecnologia", name: "Tecnología" },
    { id: "electrodomesticos", name: "Electrodomésticos" },
    { id: "transporte", name: "Transporte" },
    { id: "inmobiliaria", name: "Inmobiliaria" },
    { id: "servicios", name: "Servicios" },
    { id: "alimentos", name: "Alimentos" },
    { id: "ropa", name: "Ropa" },
    { id: "construccion", name: "Construcción" },
    { id: "salud", name: "Salud" },
    { id: "general", name: "General" },
  ]);
}
