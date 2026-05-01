import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROXY_URL = "https://blind-workstation-trucks-hired.trycloudflare.com";

// ===== LOCAL DATA =====
function getLocalData() {
  try {
    const listingsRaw = readFileSync(join(process.cwd(), "data", "listings.json"), "utf-8");
    const mipymesRaw = readFileSync(join(process.cwd(), "data", "mipymes.json"), "utf-8");
    const listings = JSON.parse(listingsRaw).filter((l: any) => l.active);
    const mipymes = JSON.parse(mipymesRaw).filter((m: any) => m.active);
    return { listings, mipymes };
  } catch {
    return { listings: [], mipymes: [] };
  }
}

const PROVINCE_MAP: Record<string, string> = {
  "la habana": "La Habana", "habana": "La Habana",
  "pinar del rio": "Pinar del Río", "matanzas": "Matanzas",
  "villa clara": "Villa Clara", "cienfuegos": "Cienfuegos",
  "camaguey": "Camagüey", "holguin": "Holguín",
  "granma": "Granma", "santiago de cuba": "Santiago de Cuba",
  "guantanamo": "Guantánamo", "artemisa": "Artemisa",
  "mayabeque": "Mayabeque", "ciego de avila": "Ciego de Ávila",
  "sancti spiritus": "Sancti Spíritus", "las tunas": "Las Tunas",
  "isla de la juventud": "Isla de la Juventud",
};

function extractProvince(text: string): string {
  if (!text) return "";
  const lower = text.toLowerCase();
  for (const [key, value] of Object.entries(PROVINCE_MAP)) {
    if (lower.includes(key)) return value;
  }
  return "";
}

// ===== LOCAL SEARCH (always works) =====
interface SearchResult {
  id: string;
  name: string;
  price: number;
  priceFormatted: string;
  currency: string;
  url: string;
  phone: string;
  province: string;
  municipality: string;
  group: string;
  source: string;
  publishDate: string;
  isBestPrice: boolean;
  notes: string;
  [key: string]: any;
}

function searchLocal(query: string): SearchResult[] {
  const { listings, mipymes } = getLocalData();
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter((w: string) => w.length > 2);
  const results: SearchResult[] = [];

  // Search listings
  for (const l of listings) {
    const text = `${l.title || ""} ${l.description || ""} ${l.category || ""} ${l.province || ""}`.toLowerCase();
    const match = words.some((w: string) => text.includes(w)) || text.includes(q);
    if (match) {
      const price = l.price || 0;
      results.push({
        id: l.id,
        name: l.title || "Sin título",
        price,
        priceFormatted: price > 0 ? `$${price.toLocaleString("es-CU")} ${l.currency || "USD"}` : "Preguntar",
        currency: l.currency || "USD",
        url: `/marketplace/${l.id}`,
        phone: l.phone || l.whatsapp || "",
        province: l.province || "",
        municipality: l.municipality || "",
        group: "Marketplace",
        source: "Marketplace",
        publishDate: l.createdAt ? new Date(l.createdAt).toLocaleDateString("es-CU") : "",
        isBestPrice: false,
        notes: (l.description || "").substring(0, 300),
      });
    }
  }

  // Search mipymes
  for (const m of mipymes) {
    const text = `${m.name || ""} ${m.description || ""} ${m.services || ""} ${m.category || ""} ${m.province || ""}`.toLowerCase();
    const match = words.some((w: string) => text.includes(w)) || text.includes(q);
    if (match) {
      results.push({
        id: m.id,
        name: m.name || "Sin nombre",
        price: 0,
        priceFormatted: "Ver negocio",
        currency: "",
        url: `/mipymes?id=${m.id}`,
        phone: m.phone || m.whatsapp || "",
        province: m.province || "",
        municipality: m.municipality || "",
        group: "Mipyme",
        source: "Mipyme",
        publishDate: m.createdAt ? new Date(m.createdAt).toLocaleDateString("es-CU") : "",
        isBestPrice: false,
        notes: `${m.description || ""} ${m.services ? "| Servicios: " + m.services : ""}`.substring(0, 300),
        category: m.category || "",
      });
    }
  }

  return results;
}

// ===== MAIN SEARCH HANDLER =====
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
    console.log("[API] Search:", q);

    // === PHASE 1: Local search (ALWAYS WORKS, no proxy needed) ===
    let allResults: SearchResult[] = searchLocal(q);
    let webError: string | undefined;

    // === PHASE 2: Try proxy for web results (optional, non-blocking) ===
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // Short timeout

      const response = await fetch(`${PROXY_URL}/search?local=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ query: q }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const webResults: SearchResult[] = (data.results || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          price: r.price || 0,
          priceFormatted: r.priceFormatted || "Ver publicación",
          currency: r.currency || "USD",
          url: r.url || "#",
          phone: r.phone || "",
          province: r.province || "",
          municipality: r.municipality || "",
          group: r.group || "Web",
          source: r.source || "Web",
          publishDate: r.publishDate || "",
          isBestPrice: false,
          notes: r.notes || "",
        }));

        // Add web results (avoid duplicates by URL)
        const localUrls = new Set(allResults.map((r) => r.url));
        for (const wr of webResults) {
          if (!localUrls.has(wr.url)) {
            allResults.push(wr);
            localUrls.add(wr.url);
          }
        }

        if (data.stats?.message) webError = data.stats.message;
      }
    } catch {
      // Proxy not available - that's fine, we still have local results
      webError = undefined;
    }

    // Sort: Marketplace/Mipyme first, then by price
    const priced = allResults.filter((r) => r.price > 0);
    if (priced.length > 0) {
      const min = Math.min(...priced.map((r) => r.price));
      allResults.forEach((r) => { r.isBestPrice = r.price > 0 && r.price === min; });
    }

    allResults.sort((a, b) => {
      const sp: Record<string, number> = { Marketplace: -1, Mipyme: 0, Telegram: 1, Facebook: 2, Revolico: 3 };
      const aPri = sp[a.source] ?? 5;
      const bPri = sp[b.source] ?? 5;
      if (aPri !== bPri) return aPri - bPri;
      if (a.price > 0 && b.price === 0) return -1;
      if (a.price === 0 && b.price > 0) return 1;
      if (a.price > 0 && b.price > 0) return a.price - b.price;
      return 0;
    });

    const sources = [...new Set(allResults.map((r) => r.source))];
    const provinces = [...new Set(allResults.filter((r) => r.province).map((r) => r.province))];
    const localCount = allResults.filter((r) => r.source === "Marketplace" || r.source === "Mipyme").length;
    const webCount = allResults.length - localCount;
    const elapsed = Date.now() - startTime;

    console.log(`[API] ${allResults.length} results (${localCount} local, ${webCount} web) in ${elapsed}ms`);

    return NextResponse.json({
      query: q,
      results: allResults,
      totalResults: allResults.length,
      stats: {
        provinces,
        sources,
        withPhone: allResults.filter((r) => r.phone).length,
        withDate: allResults.filter((r) => r.publishDate).length,
        pricedCount: priced.length,
        minPrice: priced.length > 0 ? Math.min(...priced.map((r) => r.price)) : 0,
        method: allResults.length > 0
          ? `Búsqueda ${localCount > 0 ? "local" : "web"} (${sources.join(", ")})`
          : "no-results",
        searchTime: `${(elapsed / 1000).toFixed(1)}s`,
        localCount,
        webCount,
        message: webError,
      },
    });
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json({
      query: "",
      results: [],
      totalResults: 0,
      stats: { provinces: [], sources: [], withPhone: 0, withDate: 0, pricedCount: 0, minPrice: 0, method: "error" },
    });
  }
}
