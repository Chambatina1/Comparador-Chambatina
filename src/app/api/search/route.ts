import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ZAI_CONFIG = {
  baseUrl: process.env.ZAI_BASE_URL || "http://172.25.136.193:8080/v1",
  apiKey: process.env.ZAI_API_KEY || "Z.ai",
  chatId: process.env.ZAI_CHAT_ID || "chat-7a17bbba-f5f4-4982-989c-ad0040a86066",
  token: process.env.ZAI_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTgxYmU5ZDctNzAyOC00ODEzLThhYmYtZDc3NzNkMjY1ZTc4IiwiY2hhdF9pZCI6ImNoYXQtN2ExN2JiYmEtZjVmNC00OTgyLTk4OWMtYWQwMDQwYTg2MDY2IiwicGxhdGZvcm0iOiJ6YWkifQ.0um_1S3rkuzM37d4zAXQ3qk-yN3dhtTSmsF0ppmd8Xk",
  userId: process.env.ZAI_USER_ID || "981be9d7-7028-4813-8abf-d7773d265e78",
};

// Keywords that indicate a Cuba marketplace listing
const CUBA_MARKETPLACE_KEYWORDS = [
  "cuba", "cubano", "cubana", "habana", "pinar", "holguin", "santiago",
  "villa clara", "camaguey", "matanzas", "revolico", "bachecubano",
  "ventas", "1cuba", "timbri", "dimecuba", "cibercafe",
];

interface RawResult {
  title: string;
  snippet: string;
  url: string;
  host: string;
}

interface CubaProduct {
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
  publishDate: string;
  isBestPrice: boolean;
  notes: string;
}

// Debug endpoint to test Bing from Render
export async function GET() {
  try {
    const q = "panel solar";
    const encoded = encodeURIComponent(q + " Cuba precio venta");
    const resp = await fetch(`https://www.bing.com/search?q=${encoded}&count=5&setlang=es&cc=cu`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await resp.text();
    const blocks = html.split('<li class="b_algo"');
    // Show the raw second block (first result) so we can see the HTML structure
    const rawBlock = blocks.length > 1 ? blocks[1].substring(0, 1000) : "no blocks";
    // Also try to find h2 tags
    const h2Matches = (html.match(/<h2[^>]*>[\s\S]*?<\/h2>/g) || []).slice(0, 3).map((m: string) => m.substring(0, 200));
    return NextResponse.json({
      status: resp.status,
      blockCount: blocks.length - 1,
      rawBlock: rawBlock,
      h2Samples: h2Matches,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.substring(0, 200) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Error" }, { status: 400 });

    const query = body?.query || "";
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Escribe el producto que buscas" }, { status: 400 });
    }

    const q = query.trim();
    console.log("[Finder] Search:", q);

    let rawResults: RawResult[] = [];
    let aiUsed = false;

    // === METHOD 1: Bing Search (works from cloud) ===
    try {
      rawResults = await searchBing(q);
      console.log("[Finder] Bing returned:", rawResults.length);
      if (rawResults.length > 0) {
        console.log("[Finder] Sample:", JSON.stringify(rawResults[0]).substring(0, 200));
      }
    } catch (e: any) {
      console.log("[Finder] Bing failed:", e.message?.substring(0, 200));
    }

    // === METHOD 2: SDK web_search (works from internal network) ===
    if (rawResults.length < 5) {
      try {
        const ZAI = (await import("z-ai-web-dev-sdk")).default;
        const zai = new ZAI(ZAI_CONFIG);
        const sdkResults = await Promise.race([
          searchSDK(zai, q),
          new Promise<RawResult[]>((r) => setTimeout(() => r([]), 4000)),
        ]);
        if (sdkResults.length > 0) {
          rawResults = [...rawResults, ...sdkResults];
          aiUsed = true;
          console.log("[Finder] SDK added:", sdkResults.length);
        }
      } catch (e: any) {
        console.log("[Finder] SDK failed:", e.message?.substring(0, 60));
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    rawResults = rawResults.filter((r) => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    console.log("[Finder] Total raw:", rawResults.length);

    // Filter: keep only Cuba-relevant results
    const cubaResults = rawResults.filter((r) => isCubaRelevant(r, q));
    console.log("[Finder] Cuba-relevant:", cubaResults.length);

    // Convert to CubaProduct
    let products: CubaProduct[] = cubaResults.map((r, i) => ({
      id: `r-${i}`,
      name: extractProductName(r, q),
      price: extractPrice(r.snippet + " " + r.title),
      priceFormatted: "",
      currency: extractCurrency(r.snippet + " " + r.title),
      url: r.url,
      phone: extractPhone(r.snippet + " " + r.title),
      province: extractProvince(r),
      municipality: "",
      group: extractGroup(r),
      publishDate: "",
      isBestPrice: false,
      notes: r.snippet.substring(0, 200),
    }));

    // Format prices
    products = products.map((p) => ({
      ...p,
      priceFormatted: p.price > 0 ? `$${p.price.toLocaleString("es-CU")} ${p.currency}` : "Ver publicación",
    }));

    // === AI Enhancement (if SDK available) ===
    if (aiUsed && products.length > 0) {
      try {
        const ZAI = (await import("z-ai-web-dev-sdk")).default;
        const zai = new ZAI(ZAI_CONFIG);
        products = await enhanceWithAI(zai, products, rawResults, q);
        console.log("[Finder] AI enhanced");
      } catch {
        console.log("[Finder] AI enhancement failed");
      }
    }

    // Mark best price
    const priced = products.filter((p) => p.price > 0);
    if (priced.length > 0) {
      const min = Math.min(...priced.map((p) => p.price));
      for (const p of products) p.isBestPrice = p.price > 0 && p.price === min;
    }

    const sorted = products.sort((a, b) => {
      if (a.price > 0 && b.price === 0) return -1;
      if (a.price === 0 && b.price > 0) return 1;
      if (a.price > 0 && b.price > 0) return a.price - b.price;
      return 0;
    });

    const provinces = [...new Set(products.filter((p) => p.province).map((p) => p.province))];

    return NextResponse.json({
      query: q,
      results: sorted,
      totalResults: sorted.length,
      stats: {
        provinces,
        withPhone: products.filter((p) => p.phone).length,
        withDate: 0,
        pricedCount: priced.length,
        minPrice: priced.length > 0 ? Math.min(...priced.map((p) => p.price)) : 0,
        method: aiUsed ? "SDK + Bing + IA" : "Bing",
      },
    });
  } catch (error) {
    console.error("[Finder] Fatal:", error);
    return NextResponse.json({
      query: "", results: [], totalResults: 0,
      stats: { provinces: [], withPhone: 0, withDate: 0, pricedCount: 0, minPrice: 0, method: "error" },
    });
  }
}

// ===== BING SEARCH =====
async function searchBing(query: string): Promise<RawResult[]> {
  const queries = [
    `${query} Cuba precio venta`,
    `${query} "Ventas La Habana" OR "Ventas Pinar" OR "Ventas Holguin" OR "Ventas Villa Clara" OR "Ventas Camaguey"`,
  ];

  const allResults: RawResult[] = [];

  const results = await Promise.allSettled(
    queries.map(async (q) => {
      try {
        const encoded = encodeURIComponent(q);
        const resp = await fetch(`https://www.bing.com/search?q=${encoded}&count=20&setlang=es&cc=cu`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
          },
          signal: AbortSignal.timeout(12000),
        });
        const html = await resp.text();
        return parseBingHTML(html);
      } catch {
        return [];
      }
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) allResults.push(...r.value);
  }

  return allResults;
}

function parseBingHTML(html: string): RawResult[] {
  const results: RawResult[] = [];

  // Bing results are in <li class="b_algo"> blocks
  // Each has an <h2><a href="URL">title</a></h2> and optionally <p class="b_lineclamp...">snippet</p>
  const blocks = html.split(/<li class="b_algo"/);

  for (const block of blocks.slice(1)) {
    try {
      // Extract ALL links from the block, find the main result link (in <h2>)
      // The <h2> link is the main result, it contains the actual title
      const h2Match = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/);
      if (!h2Match) continue;

      const rawUrl = h2Match[1];
      let title = h2Match[2].replace(/<[^>]*>/g, "").trim();
      if (!title || title.length < 5) continue;

      // Extract snippet from <p class="b_lineclamp...">
      let snippet = "";
      const snippetMatch = block.match(/<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/);
      if (snippetMatch) {
        snippet = snippetMatch[1].replace(/<[^>]*>/g, "").trim();
      }

      // Decode Bing redirect URL
      let realUrl = rawUrl;
      // First decode HTML entities in the URL
      let cleanUrl = rawUrl.replace(/&amp;/g, "&").replace(/&#0183;/g, "·");
      // Extract the 'u' parameter (base64-encoded real URL)
      const uMatch = cleanUrl.match(/[&?]u=([a-zA-Z0-9_-]+)/);
      if (uMatch) {
        try {
          const decoded = Buffer.from(uMatch[1], "base64").toString("utf-8");
          if (decoded.startsWith("http")) realUrl = decoded;
        } catch {}
      }

      // Extract host
      let host = "";
      try { host = new URL(realUrl).hostname.replace("www.", ""); } catch {}

      // Skip Bing redirect URLs
      if (host.includes("bing.com") && !host.includes("bing.com/ck/")) continue;

      results.push({ title, snippet, url: realUrl, host });
    } catch {
      continue;
    }
  }

  return results;
}

function isLikelyCubaHost(host: string, title: string, snippet: string): boolean {
  const text = `${host} ${title} ${snippet}`.toLowerCase();
  // Always allow known Cuba marketplaces
  if (host.includes("revolico") || host.includes("bachecubano") || host.includes("1cuba")) return true;
  if (host.includes("timbri") || host.includes("dimecuba") || host.includes("cibercafe")) return true;
  if (host.includes("facebook.com") || host.includes("fb.com")) return true;
  if (host.includes(".cu")) return true;
  // Check for Cuba keywords in text
  for (const kw of CUBA_MARKETPLACE_KEYWORDS) {
    if (text.includes(kw)) return true;
  }
  return false;
}

// ===== SDK WEB SEARCH =====
async function searchSDK(zai: any, query: string): Promise<RawResult[]> {
  const queries = [
    `${query} Cuba precio venta Facebook`,
    `${query} "Ventas La Habana" OR "Ventas Pinar" OR "Ventas Holguin"`,
  ];

  const allResults: RawResult[] = [];
  const results = await Promise.allSettled(
    queries.map(async (q) => {
      try {
        const r = await zai.functions.invoke("web_search", { query: q, num: 10 });
        return (r || []).map((item: any) => ({
          title: item.name || "",
          snippet: item.snippet || "",
          url: item.url || "",
          host: item.host_name || "",
        }));
      } catch { return []; }
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) allResults.push(...r.value);
  }
  return allResults;
}

// ===== AI ENHANCEMENT =====
async function enhanceWithAI(zai: any, products: CubaProduct[], raw: RawResult[], query: string): Promise<CubaProduct[]> {
  const contextText = raw.slice(0, 15).map((r, i) =>
    `[${i + 1}] Título: ${r.title}\nURL: ${r.url}\nDescripción: ${r.snippet}\nSitio: ${r.host}`
  ).join("\n\n");

  const prompt = `Analiza publicaciones de venta en Cuba para "${query}".
PUBLICACIONES:
${contextText}

Extrae de cada publicación RELEVANTE:
- name, price (número), currency (USD/CUP), phone (+53 5xxxxxxx), province, group, notes
Solo JSON: {"products":[{"name":"","price":0,"currency":"USD","phone":"","province":"","group":"","url":"","notes":""}]}`;

  const ai = await zai.chat.completions.create({
    messages: [
      { role: "system", content: "Extrae datos de ventas Cuba. Solo JSON." },
      { role: "user", content: prompt },
    ],
  });

  const content = ai.choices[0]?.message?.content || "";
  let parsed: any;
  try {
    parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) try { parsed = JSON.parse(m[0]); } catch { return products; }
    else return products;
  }

  if (!parsed.products?.length) return products;

  return parsed.products.map((p: any) => {
    const price = typeof p.price === "number" ? p.price : parseFloat(String(p.price).replace(/[^\d.]/g, "")) || 0;
    const currency = String(p.currency || "USD").toUpperCase();
    return {
      id: `ai-${hashStr(p.url + p.name)}`,
      name: String(p.name || "").substring(0, 150),
      price,
      priceFormatted: price > 0 ? `$${price.toLocaleString("es-CU")} ${currency}` : "Preguntar",
      currency,
      url: String(p.url || "#"),
      phone: formatPhone(String(p.phone || "")),
      province: String(p.province || "").trim(),
      municipality: "",
      group: String(p.group || "").trim(),
      publishDate: "",
      isBestPrice: false,
      notes: String(p.notes || "").trim(),
    };
  });
}

// ===== FILTERING =====
function isCubaRelevant(r: RawResult, query: string): boolean {
  const text = `${r.title} ${r.snippet} ${r.url} ${r.host}`.toLowerCase();
  const qLower = query.toLowerCase();

  // Since we use cc=cu, most results are already Cuba-focused
  // Just check that it's at least somewhat relevant to the product
  const qWords = qLower.split(" ").filter((w) => w.length > 2);
  const matchCount = qWords.filter((w) => text.includes(w)).length;

  // If most query words match, it's relevant
  if (qWords.length > 0 && matchCount >= Math.max(1, Math.floor(qWords.length * 0.5))) return true;

  // Always allow known Cuba marketplaces
  if (r.host.includes("revolico") || r.host.includes("bachecubano") || r.host.includes("1cuba")) return true;
  if (r.host.includes("timbri") || r.host.includes("dimecuba") || r.host.includes("cibercafe")) return true;
  if (r.host.includes("facebook.com") || r.host.includes("fb.com")) return true;

  return false;
}

// ===== EXTRACTION HELPERS =====
function extractProductName(r: RawResult, query: string): string {
  // Use title, clean it up
  let name = r.title;
  // Remove common suffixes
  name = name.replace(/ - .*$/, "").replace(/ \| .*$/, "").replace(/:.*$/, "");
  return name.substring(0, 120) || query;
}

function extractPrice(text: string): number {
  // Try "$150", "150usd", "150 USD", "150$"
  const patterns = [
    /\$\s*([\d,]+\.?\d*)/g,
    /([\d,]+\.?\d*)\s*(?:usd|USD|dolar|dólar)/g,
    /([\d,]+\.?\d*)\s*(?:cup|CUP|pesos?)/g,
    /(?:precio|venta|cobro)\s*:?\s*\$?\s*([\d,]+\.?\d*)/gi,
  ];

  for (const pat of patterns) {
    pat.lastIndex = 0;
    const match = pat.exec(text);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ""));
      if (num > 0 && num < 1000000) return num;
    }
  }
  return 0;
}

function extractCurrency(text: string): string {
  if (/cup|pesos?/i.test(text)) return "CUP";
  return "USD";
}

function extractPhone(text: string): string {
  // Cuban phones: +53 5xxxxxxx, 5xxxxxxx, 53 5xxxxxxx
  const patterns = [
    /\+53\s*[56]\d{7}/g,
    /53\s*[56]\d{7}/g,
    /(?:tel(?:éfono|efono)?|celular|whatsapp|wa|contacto)\s*:?\s*([56]\d{7})/gi,
  ];

  for (const pat of patterns) {
    pat.lastIndex = 0;
    const match = pat.exec(text);
    if (match) {
      let phone = match[1] || match[0];
      phone = phone.replace(/[^\d+]/g, "");
      if (phone.length === 8 && phone.startsWith("5")) phone = "+53 " + phone;
      else if (phone.length === 10 && phone.startsWith("53")) phone = "+" + phone;
      return phone;
    }
  }
  return "";
}

function extractProvince(r: RawResult): string {
  const text = `${r.title} ${r.snippet} ${r.url}`.toLowerCase();
  const provinces: [string, string][] = [
    ["la habana", "La Habana"], ["havana", "La Habana"],
    ["pinar del río", "Pinar del Río"], ["pinar del rio", "Pinar del Río"], ["pinar", "Pinar del Río"],
    ["artemisa", "Artemisa"], ["mayabeque", "Mayabeque"],
    ["matanzas", "Matanzas"], ["cienfuegos", "Cienfuegos"],
    ["villa clara", "Villa Clara"], ["santa clara", "Villa Clara"],
    ["sancti spíritus", "Sancti Spíritus"], ["sancti spiritus", "Sancti Spíritus"],
    ["ciego de ávila", "Ciego de Ávila"], ["ciego de avila", "Ciego de Ávila"],
    ["camagüey", "Camagüey"], ["camaguey", "Camagüey"],
    ["las tunas", "Las Tunas"], ["holguín", "Holguín"], ["holguin", "Holguín"],
    ["granma", "Granma"], ["bayamo", "Granma"], ["manzanillo", "Granma"],
    ["santiago de cuba", "Santiago de Cuba"], ["santiago", "Santiago de Cuba"],
    ["guantánamo", "Guantánamo"], ["guantanamo", "Guantánamo"],
  ];

  for (const [key, value] of provinces) {
    if (text.includes(key)) return value;
  }
  return "";
}

function extractGroup(r: RawResult): string {
  const text = `${r.title} ${r.snippet} ${r.url}`.toLowerCase();

  if (r.host.includes("revolico")) return "Revolico";
  if (r.host.includes("bachecubano")) return "BacheCubano";
  if (r.host.includes("1cuba")) return "1Cuba";
  if (r.host.includes("timbri")) return "Timbri";
  if (r.host.includes("dimecuba")) return "DimeCuba";
  if (r.host.includes("facebook.com/groups")) {
    const groupMatch = r.url.match(/groups\/([^/]+)/);
    if (groupMatch) return "Grupo FB: " + groupMatch[1];
    return "Grupo de Facebook";
  }

  // Check for "Ventas [Province]" in title
  const ventMatch = text.match(/ventas\s+([a-záéíóúñü\s]+)/);
  if (ventMatch) {
    const groupName = ventMatch[1].trim().split(" ").slice(0, 3).join(" ");
    return "Ventas " + groupName.charAt(0).toUpperCase() + groupName.slice(1);
  }

  return r.host || "";
}

function formatPhone(phone: string): string {
  if (!phone || phone.length < 3) return "";
  let c = phone.replace(/[^\d+]/g, "");
  if (c.length === 8 && c.startsWith("5")) c = "+53 " + c;
  else if (c.length === 10 && c.startsWith("53")) c = "+" + c;
  else if (c.length === 11 && c.startsWith("53")) c = "+" + c;
  return c;
}

function hashStr(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash).toString(36);
}
