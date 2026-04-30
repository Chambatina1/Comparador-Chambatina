import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ProductResult {
  id: string;
  name: string;
  price: number;
  priceFormatted: string;
  platform: string;
  platformName: string;
  url: string;
  image: string;
  rating: number;
  isBestPrice: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, url } = body;

    if (!query && !url) {
      return NextResponse.json(
        { error: "Escribe algo, pega un link o sube una foto" },
        { status: 400 }
      );
    }

    let searchQuery = (query || "").trim();
    let sourceUrl = (url || "").trim();

    // If user pasted a URL, extract search terms from it
    if (sourceUrl && !searchQuery) {
      try {
        const urlObj = new URL(sourceUrl);
        const pathParts = urlObj.pathname
          .replace(/[-_]/g, " ")
          .replace(/\/dp\/|\/item\/|\/p\/|\/product\//gi, " ")
          .split("/")
          .filter((w) => w.length > 2);
        searchQuery = pathParts.slice(0, 6).join(" ");
      } catch {
        searchQuery = sourceUrl.replace(/https?:\/\/(www\.)?/i, "").split("/")[1] || "";
      }
    }

    if (!searchQuery || searchQuery.length < 2) {
      return NextResponse.json(
        { error: "No se pudo identificar el producto. Intenta con una descripción más clara." },
        { status: 400 }
      );
    }

    const platformLinks = buildPlatformLinks(searchQuery);

    // Use AI SDK to search and extract real product data with prices
    let products: ProductResult[] = [];

    try {
      products = await searchWithAI(searchQuery);
    } catch (error) {
      console.error("[Search] AI search failed:", error);
      // Fallback to DDG Lite scraping
      try {
        const ddgResults = await searchDuckDuckGoLite(searchQuery);
        products = ddgResults.map((r: any) => {
          const detectedPlatform = detectPlatform(r.url, r.title);
          const priceInfo = extractPrice(r.title + " " + r.snippet);
          return {
            id: `ddg-${hashStr(r.url)}`,
            name: cleanTitle(r.title),
            price: priceInfo.amount,
            priceFormatted: priceInfo.amount > 0 ? `$${priceInfo.amount.toFixed(2)}` : "Ver precio en tienda",
            platform: detectedPlatform.platform,
            platformName: detectedPlatform.name,
            url: r.url,
            image: r.imageUrl || "",
            rating: 0,
            isBestPrice: false,
          };
        });
      } catch (e2) {
        console.error("[Search] DDG fallback also failed:", e2);
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    const uniqueProducts = products.filter((p) => {
      try {
        const key = new URL(p.url).hostname + new URL(p.url).pathname;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      } catch {
        return false;
      }
    });

    // Mark best price
    const pricedProducts = uniqueProducts.filter((p) => p.price > 0);
    if (pricedProducts.length > 0) {
      const minPrice = Math.min(...pricedProducts.map((p) => p.price));
      for (const p of uniqueProducts) {
        p.isBestPrice = p.price > 0 && p.price === minPrice;
      }
    }

    // Sort: with prices first, cheapest first
    const sorted = uniqueProducts.sort((a, b) => {
      if (a.price > 0 && b.price === 0) return -1;
      if (a.price === 0 && b.price > 0) return 1;
      if (a.price > 0 && b.price > 0) return a.price - b.price;
      return 0;
    });

    const summary = generateSummary(sorted, searchQuery);

    return NextResponse.json({
      query: searchQuery,
      results: sorted,
      platformLinks,
      summary,
      totalResults: sorted.length,
    });
  } catch (error) {
    console.error("[Search] Unexpected error:", error);
    const fallbackLinks = buildPlatformLinks("producto");
    return NextResponse.json({
      query: "",
      results: [],
      platformLinks: fallbackLinks,
      summary: "Hubo un error en la búsqueda. Usa los enlaces de abajo para buscar directamente.",
      totalResults: 0,
    });
  }
}

// ===== AI-POWERED SEARCH =====
async function searchWithAI(query: string): Promise<ProductResult[]> {
  const zai = await ZAI.create();
  const products: ProductResult[] = [];

  // Step 1: Search the web for product prices across multiple platforms
  console.log("[Search] Step 1: Web search for:", query);
  
  let searchResults: any[] = [];
  try {
    const searchResponse = await zai.functions.invoke("web_search", {
      query: `${query} price Amazon AliExpress Temu TikTok SHEIN MercadoLibre 2024 2025`,
      num: 20,
    });
    searchResults = searchResponse || [];
    console.log("[Search] Got", searchResults.length, "search results");
  } catch (e) {
    console.error("[Search] web_search failed:", e);
    // Try simpler query
    try {
      const searchResponse2 = await zai.functions.invoke("web_search", {
        query: `${query} best price buy`,
        num: 15,
      });
      searchResults = searchResponse2 || [];
      console.log("[Search] Fallback got", searchResults.length, "results");
    } catch (e2) {
      console.error("[Search] Fallback web_search also failed:", e2);
    }
  }

  if (searchResults.length === 0) {
    return [];
  }

  // Step 2: Use AI to extract structured product data from search results
  console.log("[Search] Step 2: Extracting products with AI...");

  const contextText = searchResults
    .slice(0, 15)
    .map((r: any, i: number) => {
      return `[${i + 1}] ${r.name || "Sin título"}
URL: ${r.url || ""}
Snippet: ${r.snippet || ""}`;
    })
    .join("\n\n");

  const extractionPrompt = `Eres un experto en comparación de precios de e-commerce. Analiza estos resultados de búsqueda y extrae productos reales con sus precios.

PRODUCTO BUSCADO: "${query}"

RESULTADOS DE BÚSQUEDA:
${contextText}

PLATAFORMAS RECONOCIDAS: Amazon, AliExpress, Temu, TikTok Shop, SHEIN, MercadoLibre, eBay, Walmart, Best Buy, Samsung, Target

INSTRUCCIONES:
- Extrae SOLO productos que coincidan con "${query}"
- Para CADA producto encontrado, incluye: nombre, precio en USD, plataforma/tienda, y URL
- Si un resultado tiene precio extráelo (busca $, USD, etc)
- Si no hay precio explícito pero es un producto real de la búsqueda, inclúyelo con price: 0
- Máximo 12 productos
- IMPORTANTE: Incluye productos de DIFERENTES tiendas para poder comparar precios
- Las URLs deben ser las reales de los productos

Responde SOLO en JSON válido con este formato exacto:
{
  "products": [
    {
      "name": "nombre del producto",
      "price": 29.99,
      "platform": "amazon",
      "platformName": "Amazon",
      "url": "https://...",
      "rating": 4.5
    }
  ]
}

Si no encuentras productos relevantes, responde con {"products": []}`;

  try {
    const aiResponse = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Eres un extractor de datos de productos. Siempre responde en JSON válido. No incluyas texto fuera del JSON.",
        },
        {
          role: "user",
          content: extractionPrompt,
        },
      ],
    });

    const content = aiResponse.choices[0]?.message?.content || "";
    console.log("[Search] AI response length:", content.length);

    // Parse JSON from response
    let parsed: any;
    try {
      const jsonStr = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.error("[Search] Could not parse AI response as JSON");
        return [];
      }
    }

    const extractedProducts = parsed.products || [];
    console.log("[Search] AI extracted", extractedProducts.length, "products");

    for (const p of extractedProducts) {
      if (!p.name || !p.url) continue;

      const platformInfo = p.platformName
        ? { platform: (p.platform || p.platformName.toLowerCase()).replace(/\s/g, ""), name: p.platformName }
        : detectPlatform(p.url, p.name);

      const price = typeof p.price === "number" ? p.price : parseFloat(String(p.price)) || 0;

      products.push({
        id: `ai-${hashStr(p.url + p.name)}`,
        name: String(p.name).substring(0, 120),
        price: price,
        priceFormatted: price > 0 ? `$${price.toFixed(2)}` : "Ver precio en tienda",
        platform: platformInfo.platform,
        platformName: platformInfo.name,
        url: String(p.url),
        image: "",
        rating: typeof p.rating === "number" ? p.rating : 0,
        isBestPrice: false,
      });
    }
  } catch (e) {
    console.error("[Search] AI extraction error:", e);
  }

  return products;
}

// ===== DUCKDUCKGO FALLBACK =====
async function searchDuckDuckGoLite(query: string): Promise<any[]> {
  const results: any[] = [];
  const searchTerms = [`${query} price buy`, `${query} best price`];

  for (const term of searchTerms) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const formData = new URLSearchParams();
        formData.append("q", term);

        const res = await fetch("https://lite.duckduckgo.com/lite/", {
          method: "POST",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "text/html",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded",
            Origin: "https://lite.duckduckgo.com",
            Referer: "https://lite.duckduckgo.com/",
          },
          body: formData.toString(),
          signal: controller.signal as unknown as AbortSignal,
        });

        if (!res.ok) continue;
        const html = await res.text();
        const allRows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];

        for (let i = 0; i < allRows.length - 2; i++) {
          const row = allRows[i];
          const linkMatch = row.match(/<a[^>]+href="([^"]*(?:uddg=)[^"]*)"[^>]*>([\s\S]*?)<\/a>/);
          if (!linkMatch) continue;

          let decodedUrl = "";
          try {
            const uddgMatch = linkMatch[1].match(/uddg=([^&]+)/);
            if (uddgMatch) decodedUrl = decodeURIComponent(uddgMatch[1]);
          } catch {}

          if (!decodedUrl || decodedUrl.includes("duckduckgo.com")) continue;

          const title = linkMatch[2].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
          let snippet = "";
          if (i + 1 < allRows.length) {
            const snippetText = allRows[i + 1].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
            if (snippetText && !snippetText.startsWith("www.") && snippetText.length > 20) snippet = snippetText;
          }

          if (title && decodedUrl) results.push({ url: decodedUrl, title, snippet, imageUrl: "" });
        }

        if (results.length > 0) break;
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      console.error("[Search] DDG error:", e);
    }
  }
  return results;
}

// ===== UTILITY FUNCTIONS =====
function buildPlatformLinks(searchQuery: string) {
  const encoded = encodeURIComponent(searchQuery);
  return [
    { name: "Amazon", platform: "amazon", color: "#FF9900", bgColor: "#FF990014", logo: "📦", searchUrl: `https://www.amazon.com/s?k=${encoded}`, shopUrl: `https://www.amazon.com/s?k=${encoded}` },
    { name: "AliExpress", platform: "aliexpress", color: "#FF4747", bgColor: "#FF474714", logo: "🛍️", searchUrl: `https://www.aliexpress.com/wholesale?SearchText=${encoded}`, shopUrl: `https://www.aliexpress.com/wholesale?SearchText=${encoded}` },
    { name: "SHEIN", platform: "shein", color: "#1A1A1A", bgColor: "#1A1A1A14", logo: "👗", searchUrl: `https://www.shein.com/${encoded}-c-2260.html`, shopUrl: `https://www.shein.com/${encoded}-c-2260.html` },
    { name: "Temu", platform: "temu", color: "#FB6F20", bgColor: "#FB6F2014", logo: "🧡", searchUrl: `https://www.temu.com/search-result.html?search_key=${encoded}`, shopUrl: `https://www.temu.com/search-result.html?search_key=${encoded}` },
    { name: "TikTok Shop", platform: "tiktok", color: "#FE2C55", bgColor: "#FE2C5514", logo: "🎵", searchUrl: `https://www.tiktok.com/search?q=${encoded}&type=product`, shopUrl: `https://www.tiktok.com/search?q=${encoded}&type=product` },
    { name: "MercadoLibre", platform: "mercadolibre", color: "#FFE600", bgColor: "#FFE60014", logo: "🛒", searchUrl: `https://listado.mercadolibre.com/${encoded}`, shopUrl: `https://www.mercadolibre.com/${encoded}` },
  ];
}

function detectPlatform(url: string, title: string): { platform: string; name: string } {
  const patterns: Array<{ re: RegExp; platform: string; name: string }> = [
    { re: /amazon\./i, platform: "amazon", name: "Amazon" },
    { re: /mercadolibre|mercadolivre/i, platform: "mercadolibre", name: "MercadoLibre" },
    { re: /aliexpress/i, platform: "aliexpress", name: "AliExpress" },
    { re: /temu/i, platform: "temu", name: "Temu" },
    { re: /shein/i, platform: "shein", name: "SHEIN" },
    { re: /tiktok/i, platform: "tiktok", name: "TikTok Shop" },
    { re: /samsung\./i, platform: "samsung", name: "Samsung" },
    { re: /ebay/i, platform: "ebay", name: "eBay" },
    { re: /walmart/i, platform: "walmart", name: "Walmart" },
    { re: /target/i, platform: "target", name: "Target" },
    { re: /bestbuy/i, platform: "bestbuy", name: "Best Buy" },
  ];
  const text = url + " " + title;
  for (const p of patterns) {
    if (p.re.test(text)) return { platform: p.platform, name: p.name };
  }
  return { platform: "otra", name: "Otra tienda" };
}

function extractPrice(text: string): { amount: number; formatted: string } {
  const patterns = [/\$\s?([\d,]+\.?\d*)/g, /USD\s?([\d,]+\.?\d*)/gi, /([\d,]+\.?\d*)\s?USD/gi, /€\s?([\d,]+\.?\d*)/g, /R\$\s?([\d,]+\.?\d*)/g];
  let bestAmount = 0;
  let bestFormatted = "";
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const numStr = match[1].replace(/,/g, "");
      const amount = parseFloat(numStr);
      if (amount > 0 && amount < 999999 && (!bestAmount || amount < bestAmount)) {
        bestAmount = amount;
        bestFormatted = match[0].trim();
      }
    }
  }
  return bestAmount > 0 ? { amount: bestAmount, formatted: bestFormatted } : { amount: 0, formatted: "" };
}

function cleanTitle(title: string): string {
  let clean = title.replace(/\s*[-|–—]\s*(Amazon|AliExpress|Temu|SHEIN|MercadoLibre|TikTok|eBay|Walmart).*$/i, "").replace(/\s*[-|–—]\s*$/, "").replace(/<[^>]*>/g, "").trim();
  if (clean.length > 120) clean = clean.substring(0, 117) + "...";
  return clean || title.substring(0, 80);
}

function hashStr(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function generateSummary(results: ProductResult[], query: string): string {
  const priced = results.filter((r) => r.price > 0);
  const platformNames = [...new Set(results.map((r) => r.platformName))];

  if (results.length === 0) {
    return `No encontramos resultados directamente, pero puedes buscar en cada tienda usando los enlaces de abajo.`;
  }

  if (priced.length === 0) {
    return `Encontramos ${results.length} resultado(s) en ${platformNames.join(", ")}. Haz clic en cada uno para ver el precio en la tienda.`;
  }

  const min = Math.min(...priced.map((r) => r.price));
  const max = Math.max(...priced.map((r) => r.price));
  const cheapest = priced.find((r) => r.price === min);
  const avg = priced.reduce((s, r) => s + r.price, 0) / priced.length;

  if (priced.length === 1) {
    return `Encontramos 1 precio para "${query}": $${min.toFixed(2)} en ${cheapest?.platformName}.`;
  }

  const savings = max - min;
  return `${priced.length} precios encontrados para "${query}" en ${platformNames.join(", ")}. Rango: $${min.toFixed(2)} - $${max.toFixed(2)} | Promedio: $${avg.toFixed(2)} | Mejor precio: ${cheapest?.platformName} — ahorras hasta $${savings.toFixed(2)}`;
}
