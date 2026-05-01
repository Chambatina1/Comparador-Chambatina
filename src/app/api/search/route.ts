import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const PROVINCE_MAP: Record<string, string> = {
  "la habana": "La Habana", "havana": "La Habana", "habana": "La Habana",
  "pinar del rio": "Pinar del Río", "pinar": "Pinar del Río",
  "matanzas": "Matanzas", "villa clara": "Villa Clara", "santa clara": "Villa Clara",
  "cienfuegos": "Cienfuegos", "sancti spiritus": "Sancti Spíritus",
  "ciego de avila": "Ciego de Ávila", "camaguey": "Camagüey", "camagüey": "Camagüey",
  "las tunas": "Las Tunas", "holguin": "Holguín", "holguín": "Holguín",
  "granma": "Granma", "bayamo": "Granma",
  "santiago de cuba": "Santiago de Cuba", "santiago": "Santiago de Cuba",
  "guantanamo": "Guantánamo", "guantánamo": "Guantánamo",
  "artemisa": "Artemisa", "mayabeque": "Mayabeque",
  "isla de la juventud": "Isla de la Juventud",
};

function detectSource(url: string): string {
  if (!url) return "Web";
  if (url.includes("t.me") || url.includes("telegram.org")) return "Telegram";
  if (url.includes("facebook.com") || url.includes("fb.com") || url.includes("fb.watch")) return "Facebook";
  if (url.includes("revolico")) return "Revolico";
  if (url.includes("bachecubano")) return "Bachecubano";
  if (url.includes("1cuba")) return "1Cuba";
  if (url.includes("timbri")) return "Timbri";
  if (url.includes("dimecuba")) return "DimeCuba";
  if (url.includes("porlalivre")) return "PorLaLive";
  if (url.includes("cuballama")) return "Cuballama";
  if (url.includes("annuncicuba")) return "AnnunciCuba";
  return "Web";
}

function extractProvince(text: string): string {
  if (!text) return "";
  const lower = text.toLowerCase();
  for (const [key, value] of Object.entries(PROVINCE_MAP)) {
    if (lower.includes(key)) return value;
  }
  return "";
}

function extractPhone(text: string): string {
  if (!text) return "";
  const match = text.match(/\+53\s*[56]\d{7}/) || text.match(/53\s*[56]\d{7}/) || text.match(/5[56]\d{7}/);
  if (!match) return "";
  let phone = match[0].replace(/[^\d+]/g, "");
  if (phone.length === 8) phone = "+53 " + phone;
  else if (phone.length === 10 && phone.startsWith("53")) phone = "+" + phone;
  return phone;
}

function extractPrice(text: string): { price: number; currency: string } {
  if (!text) return { price: 0, currency: "USD" };
  const patterns = [
    /\$\s*([\d,]+\.?\d*)\s*(usd|cup|mlc|eur|pesos?|cuc)?/i,
    /([\d,]+\.?\d*)\s*(usd|cup|mlc|eur|pesos?|cuc)\b/i,
    /([\d,]+\.?\d*)\s*\$/,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const price = parseFloat(m[1].replace(/,/g, "")) || 0;
      const cur = (m[2] || "USD").toUpperCase();
      if (price > 0 && price < 999999) return { price, currency: cur === "PESO" || cur === "PESOS" ? "CUP" : cur };
    }
  }
  return { price: 0, currency: "USD" };
}

function extractGroup(url: string, title: string): string {
  if (!url) return "";
  if (url.includes("t.me/")) {
    const parts = url.split("t.me/");
    if (parts[1]) {
      const channel = parts[1].split("/")[0].split("?")[0].split("#")[0];
      if (channel) return "Telegram: @" + channel;
    }
  }
  if (url.includes("facebook.com/groups/")) {
    return "Facebook Group";
  }
  return detectSource(url);
}

// ========== DuckDuckGo Scraping ==========
async function scrapeDDG(queryStr: string): Promise<Array<{ url: string; name: string; snippet: string; host_name: string }>> {
  try {
    const encoded = encodeURIComponent(queryStr);
    const resp = await fetch("https://html.duckduckgo.com/html/?q=" + encoded, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const results: Array<{ url: string; name: string; snippet: string; host_name: string }> = [];
    const blocks = html.split(/<div[^>]*class="[^"]*result[^"]*"[^>]*>/);
    for (const block of blocks.slice(1)) {
      try {
        const linkMatch = block.match(/class="result__a"[^>]*href="([^"]*)"/);
        const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
        if (!linkMatch || !titleMatch) continue;
        let url = linkMatch[1].replace(/&amp;/g, "&");
        const uddgMatch = url.match(/[&?]uddg=([^&]+)/);
        if (uddgMatch) { try { url = decodeURIComponent(uddgMatch[1]); } catch { /* keep original */ } }
        const title = titleMatch[1].replace(/<[^>]*>/g, "").trim();
        if (!title || title.length < 5) continue;
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|span|div)>/);
        let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";
        let host = "";
        try { host = new URL(url).hostname.replace("www.", ""); } catch { /* invalid url */ }
        results.push({ url, name: title, snippet, host_name: host });
      } catch { continue; }
    }
    return results;
  } catch {
    return [];
  }
}

// ========== Bing Scraping ==========
async function scrapeBing(queryStr: string): Promise<Array<{ url: string; name: string; snippet: string; host_name: string }>> {
  try {
    const encoded = encodeURIComponent(queryStr);
    const resp = await fetch("https://www.bing.com/search?q=" + encoded + "&count=10&setlang=es&cc=cu", {
      headers: { "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9" },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const blocks = html.split(/<li class="b_algo"/);
    const results: Array<{ url: string; name: string; snippet: string; host_name: string }> = [];
    for (const block of blocks.slice(1)) {
      try {
        const h2Match = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/);
        if (!h2Match) continue;
        let title = h2Match[2].replace(/<[^>]*>/g, "").trim();
        if (!title || title.length < 5) continue;
        let snippet = "";
        const snippetMatch = block.match(/<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/);
        if (snippetMatch) snippet = snippetMatch[1].replace(/<[^>]*>/g, "").trim();
        let realUrl = h2Match[1].replace(/&amp;/g, "&");
        const uMatch = realUrl.match(/[&?]u=([a-zA-Z0-9_-]+)/);
        if (uMatch) {
          try {
            const decoded = Buffer.from(uMatch[1], "base64").toString("utf-8");
            if (decoded.startsWith("http")) realUrl = decoded;
          } catch { /* keep original */ }
        }
        let host = "";
        try { host = new URL(realUrl).hostname.replace("www.", ""); } catch { /* invalid */ }
        if (host.includes("bing.com") || host.includes("microsoft.com")) continue;
        results.push({ url: realUrl, name: title, snippet, host_name: host });
      } catch { continue; }
    }
    return results;
  } catch {
    return [];
  }
}

// ========== Google Scraping ==========
async function scrapeGoogle(queryStr: string): Promise<Array<{ url: string; name: string; snippet: string; host_name: string }>> {
  try {
    const encoded = encodeURIComponent(queryStr);
    const resp = await fetch("https://www.google.com/search?q=" + encoded + "&num=10&hl=es&gl=cu", {
      headers: { "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9" },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const results: Array<{ url: string; name: string; snippet: string; host_name: string }> = [];
    // Google uses <div class="g"> for results
    const blocks = html.split(/<div[^>]*class="[^"]*(?:g Ww4FFb|yuRUbf)[^"]*"[^>]*>/);
    for (const block of blocks.slice(1)) {
      try {
        const linkMatch = block.match(/href="(https?:\/\/[^"]+)"/);
        const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
        if (!linkMatch || !titleMatch) continue;
        const url = linkMatch[1].replace(/&amp;/g, "&");
        if (url.includes("google.com")) continue;
        const title = titleMatch[1].replace(/<[^>]*>/g, "").trim();
        if (!title || title.length < 5) continue;
        const snippetMatch = block.match(/<div[^>]*data-sncf[^>]*>([\s\S]*?)<\/div>/) || block.match(/<span[^>]*class="[^"]*aCOpRe[^"]*"[^>]*>([\s\S]*?)<\/span>/);
        let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";
        let host = "";
        try { host = new URL(url).hostname.replace("www.", ""); } catch { /* invalid */ }
        results.push({ url, name: title, snippet, host_name: host });
      } catch { continue; }
    }
    return results;
  } catch {
    return [];
  }
}

// ========== Build product from raw result ==========
interface RawResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
}

interface Product {
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
}

function buildProduct(raw: RawResult, index: number, query: string): Product {
  const fullText = (raw.name + " " + raw.snippet).toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const relevant = queryWords.some(w => fullText.includes(w));
  const { price, currency } = extractPrice(raw.name + " " + raw.snippet);
  const phone = extractPhone(raw.name + " " + raw.snippet);
  const province = extractProvince(raw.name + " " + raw.snippet);
  const group = extractGroup(raw.url, raw.name);
  const source = detectSource(raw.url);

  return {
    id: "r-" + index,
    name: raw.name.substring(0, 200),
    price,
    priceFormatted: price > 0 ? "$" + price.toLocaleString("es-CU") + " " + currency : "Ver publicación",
    currency,
    url: raw.url,
    phone,
    province,
    municipality: "",
    group,
    source,
    publishDate: "",
    isBestPrice: false,
    notes: raw.snippet.substring(0, 300),
    _relevant: relevant,
  } as Product & { _relevant: boolean };
}

function sortProducts(products: (Product & { _relevant?: boolean })[]): Product[] {
  const priced = products.filter(p => p.price > 0);
  if (priced.length > 0) {
    const min = Math.min(...priced.map(p => p.price));
    products.forEach(p => { p.isBestPrice = p.price > 0 && p.price === min; });
  }
  products.sort((a, b) => {
    if (a._relevant && !b._relevant) return -1;
    if (!a._relevant && b._relevant) return 1;
    if (a.price > 0 && b.price === 0) return -1;
    if (a.price === 0 && b.price > 0) return 1;
    const sp: Record<string, number> = { "Telegram": 0, "Facebook": 1, "Revolico": 2, "Bachecubano": 3, "PorLaLive": 4 };
    const aPri = sp[a.source] ?? 5;
    const bPri = sp[b.source] ?? 5;
    if (aPri !== bPri) return aPri - bPri;
    if (a.price > 0 && b.price > 0) return a.price - b.price;
    return 0;
  });
  return products;
}

// ========== Main Search Handler ==========
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

    // Build diverse queries covering multiple sources
    const queries = [
      `"${q}" Cuba compra venta precio`,
      `${q} canal telegram Cuba`,
      `${q} "se vende" OR "vendo" Cuba`,
      `${q} site:revolico.com`,
      `${q} site:porlalivre.com`,
      `${q} site:bachecubano.com`,
      `"${q}" Facebook Cuba`,
    ];

    // Scrape DuckDuckGo in parallel
    console.log("[API] Scraping DuckDuckGo...");
    const ddgResults = await Promise.allSettled(
      queries.map(sq => scrapeDDG(sq))
    );
    let allResults: RawResult[] = [];
    for (const r of ddgResults) {
      if (r.status === "fulfilled" && r.value.length > 0) {
        allResults.push(...r.value);
      }
    }
    console.log("[API] DDG total:", allResults.length);

    // If not enough, scrape Bing
    if (allResults.length < 10) {
      console.log("[API] Scraping Bing...");
      const bingQueries = [
        `${q} Cuba compra venta`,
        `${q} telegram Cuba`,
      ];
      const bingResults = await Promise.allSettled(
        bingQueries.map(sq => scrapeBing(sq))
      );
      for (const r of bingResults) {
        if (r.status === "fulfilled" && r.value.length > 0) {
          allResults.push(...r.value);
        }
      }
      console.log("[API] After Bing:", allResults.length);
    }

    // If still not enough, try Google
    if (allResults.length < 8) {
      console.log("[API] Scraping Google...");
      const googleResults = await scrapeGoogle(`${q} Cuba compra venta precio`);
      if (googleResults.length > 0) {
        allResults.push(...googleResults);
      }
      console.log("[API] After Google:", allResults.length);
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    allResults = allResults.filter(r => {
      if (!r.url) return false;
      const key = r.url.split("?")[0].split("#")[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log("[API] Unique results:", allResults.length);

    if (allResults.length === 0) {
      return NextResponse.json({
        query: q, results: [], totalResults: 0,
        stats: { provinces: [], sources: [], withPhone: 0, withDate: 0, pricedCount: 0, minPrice: 0, method: "sin-resultados" },
      });
    }

    // Build products
    let products = allResults.map((r, i) => buildProduct(r, i, q));
    const relevant = products.filter(p => p._relevant);
    const nonRelevant = products.filter(p => !p._relevant);
    products = sortProducts([...relevant, ...nonRelevant.slice(0, 5)].slice(0, 25));

    const provinces = [...new Set(products.filter(p => p.province).map(p => p.province))];
    const sources = [...new Set(products.map(p => p.source))];
    const priced = products.filter(p => p.price > 0);
    const elapsed = Date.now() - startTime;

    console.log(`[API] Done in ${elapsed}ms - ${products.length} products from ${sources.join(", ")}`);

    return NextResponse.json({
      query: q,
      results: products.map(({ _relevant, ...rest }) => rest),
      totalResults: products.length,
      stats: {
        provinces,
        sources,
        withPhone: products.filter(p => p.phone).length,
        withDate: 0,
        pricedCount: priced.length,
        minPrice: priced.length > 0 ? Math.min(...priced.map(p => p.price)) : 0,
        method: "Busqueda web directa (" + sources.join(", ") + ")",
        searchTime: (elapsed / 1000).toFixed(1) + "s",
      },
    });
  } catch (error) {
    console.error("[API] Fatal error:", error);
    return NextResponse.json({
      query: "", results: [], totalResults: 0,
      stats: { provinces: [], sources: [], withPhone: 0, withDate: 0, pricedCount: 0, minPrice: 0, method: "error" },
    });
  }
}
