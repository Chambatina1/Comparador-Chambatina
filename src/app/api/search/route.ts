import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// SDK direct config (no config file needed)
const ZAI_CONFIG = {
  baseUrl: process.env.ZAI_BASE_URL || "http://172.25.136.193:8080/v1",
  apiKey: process.env.ZAI_API_KEY || "Z.ai",
  chatId: process.env.ZAI_CHAT_ID || "chat-7a17bbba-f5f4-4982-989c-ad0040a86066",
  token: process.env.ZAI_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTgxYmU5ZDctNzAyOC00ODEzLThhYmYtZDc3NzNkMjY1ZTc4IiwiY2hhdF9pZCI6ImNoYXQtN2ExN2JiYmEtZjVmNC00OTgyLTk4OWMtYWQwMDQwYTg2MDY2IiwicGxhdGZvcm0iOiJ6YWkifQ.0um_1S3rkuzM37d4zAXQ3qk-yN3dhtTSmsF0ppmd8Xk",
  userId: process.env.ZAI_USER_ID || "981be9d7-7028-4813-8abf-d7773d265e78",
};

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

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Error al leer la solicitud" }, { status: 400 });
    }

    const query = body?.query || "";
    console.log("[CubaFinder] Query:", query);

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Escribe el producto que buscas" }, { status: 400 });
    }

    const searchQuery = query.trim();
    let products: CubaProduct[] = [];
    let sdkAvailable = false;

    // === METHOD 1: Try SDK web_search with 5s connection timeout ===
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = new ZAI(ZAI_CONFIG);
      console.log("[CubaFinder] SDK direct init OK, trying web_search...");
      // Race: if SDK search takes > 5s, skip it
      products = await Promise.race([
        searchWithSDK(zai, searchQuery),
        new Promise<CubaProduct[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]);
      if (products.length > 0) {
        sdkAvailable = true;
        console.log("[CubaFinder] SDK search returned:", products.length);
      }
    } catch (e: any) {
      console.log("[CubaFinder] SDK not available:", e.message?.substring(0, 80));
    }

    // === METHOD 2: Fallback to DuckDuckGo HTML scraping ===
    if (products.length === 0) {
      console.log("[CubaFinder] Falling back to DuckDuckGo HTML...");
      try {
        products = await searchDuckDuckGoHTML(searchQuery);
        console.log("[CubaFinder] DDG returned:", products.length);
      } catch (e: any) {
        console.error("[CubaFinder] DDG error:", e.message?.substring(0, 80));
      }
    }

    // === METHOD 3: Try AI extraction if we have SDK ===
    if (sdkAvailable && products.length > 0) {
      try {
        const ZAI = (await import("z-ai-web-dev-sdk")).default;
        const zai = new ZAI(ZAI_CONFIG);
        products = await extractWithAI(zai, products, searchQuery);
        console.log("[CubaFinder] AI extraction done, results:", products.length);
      } catch (e: any) {
        console.log("[CubaFinder] AI extraction failed:", e.message?.substring(0, 80));
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
      query: searchQuery,
      results: sorted,
      totalResults: sorted.length,
      stats: {
        provinces,
        withPhone: products.filter((p) => p.phone).length,
        withDate: products.filter((p) => p.publishDate).length,
        pricedCount: priced.length,
        minPrice: priced.length > 0 ? Math.min(...priced.map((p) => p.price)) : 0,
        method: sdkAvailable ? "SDK + AI" : "DuckDuckGo",
      },
    });
  } catch (error) {
    console.error("[CubaFinder] Fatal error:", error);
    return NextResponse.json({
      query: "",
      results: [],
      totalResults: 0,
      stats: { provinces: [], withPhone: 0, withDate: 0, pricedCount: 0, minPrice: 0, method: "error" },
    });
  }
}

// ===== SDK WEB SEARCH =====
async function searchWithSDK(zai: any, query: string): Promise<CubaProduct[]> {
  // Fewer queries, more focused on Facebook Cuba groups
  const searchQueries = [
    `${query} Cuba precio venta Facebook`,
    `${query} "Ventas La Habana" OR "Ventas Pinar" OR "Ventas Holguin"`,
    `${query} "Ventas Villa Clara" OR "Ventas Camaguey" OR "Ventas Santiago"`,
  ];

  let allResults: any[] = [];

  // Run all 3 in parallel with timeout
  const results = await Promise.allSettled(
    searchQueries.map(async (q) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const r = await zai.functions.invoke("web_search", { query: q, num: 10 });
        clearTimeout(timeout);
        return r || [];
      } catch {
        return [];
      }
    })
  );
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) allResults.push(...r.value);
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return unique.map((r, i) => ({
    id: `sdk-${i}`,
    name: r.name || "",
    price: 0,
    priceFormatted: "Ver publicación",
    currency: "USD",
    url: r.url || "#",
    phone: "",
    province: "",
    municipality: "",
    group: extractGroupFromUrl(r.url || "", r.name || ""),
    publishDate: r.date || "",
    isBestPrice: false,
    notes: r.snippet ? r.snippet.substring(0, 200) : "",
    _rawTitle: r.name,
    _rawSnippet: r.snippet,
    _rawHost: r.host_name,
  }));
}

// ===== DUCKDUCKGO HTML SCRAPING =====
async function searchDuckDuckGoHTML(query: string): Promise<CubaProduct[]> {
  const searches = [
    `${query} Cuba precio venta`,
    `${query} "Ventas" Cuba Facebook`,
  ];

  let allHtmlResults: any[] = [];

  // Run in parallel with short timeout
  const results = await Promise.allSettled(
    searches.map(async (q) => {
      try {
        const encoded = encodeURIComponent(q);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "es-ES,es;q=0.9",
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const html = await resp.text();
        const parsed = parseDDGResults(html);
        return parsed;
      } catch (e: any) {
        console.log("[CubaFinder] DDG search failed:", e.message?.substring(0, 50));
        return [];
      }
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) allHtmlResults.push(...r.value);
  }

  // Deduplicate
  const seen = new Set<string>();
  return allHtmlResults.filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

function parseDDGResults(html: string): any[] {
  const results: any[] = [];

  // DDG HTML results have this structure:
  // <a class="result__a" href="...">title</a>
  // <a class="result__snippet" href="...">snippet</a>
  const resultBlocks = html.split('class="result__body"');
  for (const block of resultBlocks.slice(1)) {
    try {
      const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      const urlMatch = block.match(/class="result__url"[^>]*>([\s\S]*?)<\/a>/);

      if (!titleMatch) continue;

      const title = titleMatch[1].replace(/<[^>]*>/g, "").trim();
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      let url = "";

      if (urlMatch) {
        url = urlMatch[1].replace(/<[^>]*>/g, "").trim();
      } else {
        // Try to find URL in the first link
        const hrefMatch = block.match(/href="(https?:\/\/[^"]+)"/);
        if (hrefMatch) url = hrefMatch[1];
      }

      // Skip non-relevant results
      if (!title || title.length < 5) continue;

      results.push({ title, snippet, url });
    } catch {
      continue;
    }
  }

  return results.map((r, i) => ({
    id: `ddg-${i}`,
    name: r.title,
    price: 0,
    priceFormatted: "Ver publicación",
    currency: "USD",
    url: r.url || "#",
    phone: "",
    province: "",
    municipality: "",
    group: extractGroupFromUrl(r.url, r.title),
    publishDate: "",
    isBestPrice: false,
    notes: r.snippet ? r.snippet.substring(0, 200) : "",
    _rawTitle: r.title,
    _rawSnippet: r.snippet,
    _rawHost: extractHost(r.url),
  }));
}

// ===== AI EXTRACTION =====
async function extractWithAI(zai: any, rawProducts: CubaProduct[], query: string): Promise<CubaProduct[]> {
  const contextText = rawProducts.slice(0, 15).map((r, i) => {
    return `[${i + 1}]
Título: ${r._rawTitle || r.name}
Descripción: ${r._rawSnippet || r.notes}
URL: ${r.url}
Sitio: ${r._rawHost || ""}
Grupo: ${r.group}`;
  }).join("\n\n");

  const prompt = `Eres un extractor de datos de ventas en Cuba, especialmente grupos de Facebook tipo "Ventas La Habana", "Ventas Pinar", etc.

PRODUCTO BUSCADO: "${query}"

PUBLICACIONES ENCONTRADAS:
${contextText}

INSTRUCCIONES:
- Analiza cada publicación y determina si es relevante para "${query}"
- Extrae PRECIO (número), TELEFONO (+53 5xxxxxxx), PROVINCIA, GRUPO DE FACEBOOK
- Los grupos "Ventas [Provincia]" son de Cuba
- Teléfonos cubanos: 8 dígitos, empiezan con 5
- "$150" o "150usd" = price: 150, currency: "USD"
- "150 CUP" o "150 pesos" = price: 150, currency: "CUP"
- NO inventes datos que no aparezcan
- Si la publicación NO es relevante para venta del producto, exclúyela

Responde SOLO con JSON:
{"products":[{"name":"","price":0,"currency":"USD","phone":"","province":"","municipality":"","group":"","publishDate":"","url":"","notes":""}]}`;

  const ai = await zai.chat.completions.create({
    messages: [
      { role: "system", content: "Extrae datos de ventas Cuba. Solo JSON. No inventes." },
      { role: "user", content: prompt },
    ],
  });

  const content = ai.choices[0]?.message?.content || "";
  let parsed: any;
  try {
    parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
    else return rawProducts;
  }

  if (!parsed.products || parsed.products.length === 0) return rawProducts;

  return parsed.products.map((p: any) => {
    const price = typeof p.price === "number" ? p.price : parseFloat(String(p.price).replace(/[^\d.]/g, "")) || 0;
    const currency = String(p.currency || "USD").toUpperCase();
    return {
      id: `ai-${hashStr(p.url + p.name + (p.phone || ""))}`,
      name: String(p.name || "").substring(0, 150),
      price,
      priceFormatted: price > 0 ? `$${price.toLocaleString("es-CU")} ${currency}` : "Preguntar",
      currency,
      url: String(p.url || "#"),
      phone: formatPhone(String(p.phone || "")),
      province: String(p.province || "").trim(),
      municipality: String(p.municipality || "").trim(),
      group: String(p.group || "").trim(),
      publishDate: String(p.publishDate || "").trim(),
      isBestPrice: false,
      notes: String(p.notes || "").trim(),
    };
  });
}

// ===== HELPERS =====
function extractGroupFromUrl(url: string, title: string): string {
  const text = `${url} ${title}`.toLowerCase();
  const cubanGroups = [
    "Ventas La Habana", "Ventas Pinar", "Ventas Pinar del Río", "Ventas Artemisa",
    "Ventas Mayabeque", "Ventas Matanzas", "Ventas Cienfuegos", "Ventas Villa Clara",
    "Ventas Sancti Spíritus", "Ventas Ciego de Ávila", "Ventas Camagüey",
    "Ventas Las Tunas", "Ventas Holguín", "Ventas Granma", "Ventas Santiago de Cuba",
    "Ventas Guantánamo", "Ventas Cárdenas", "Ventas Santa Clara", "Ventas Bayamo",
    "Ventas Manzanillo", "Ventas Morón", "Ventas Gibara", "Ventas Puerto Padre",
    "Ventas Contramaestre", "Ventas Trinidad", "Ventas Baracoa", "Ventas Moa",
  ];

  for (const group of cubanGroups) {
    if (text.includes(group.toLowerCase())) return group;
  }

  if (text.includes("revolico")) return "Revolico";
  if (text.includes("bachecubano")) return "BacheCubano";
  if (text.includes("1cuba")) return "1Cuba";
  if (text.includes("timbri")) return "Timbri";
  if (text.includes("facebook.com/groups")) return "Grupo de Facebook";

  const host = extractHost(url);
  if (host) return host;

  return "";
}

function extractHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace("www.", "");
  } catch {
    return "";
  }
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
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
