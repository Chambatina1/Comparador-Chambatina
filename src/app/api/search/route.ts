import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROXY_URL = "https://blind-workstation-trucks-hired.trycloudflare.com";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Error" }, { status: 400 });

    const query = body?.query || "";
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Escribe el producto que buscas" }, { status: 400 });
    }

    const q = query.trim();
    console.log("[API] Search:", q, "via proxy");

    // Try proxy (with longer timeout)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 50000);

      const response = await fetch(`${PROXY_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ query: q }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[API] Proxy returned ${data.totalResults} results in ${elapsed}s`);
        return NextResponse.json(data);
      } else {
        console.log("[API] Proxy status:", response.status);
      }
    } catch (proxyErr: any) {
      console.log("[API] Proxy error:", proxyErr.message?.substring(0, 100));
    }

    // Fallback
    return NextResponse.json({
      query: q,
      results: [],
      totalResults: 0,
      stats: {
        provinces: [], sources: [], withPhone: 0,
        withDate: 0, pricedCount: 0, minPrice: 0,
        method: "Busqueda no disponible - intenta de nuevo en unos segundos",
      },
    });
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json({
      query: "", results: [], totalResults: 0,
      stats: { provinces: [], sources: [], withPhone: 0, withDate: 0, pricedCount: 0, minPrice: 0, method: "error" },
    });
  }
}
