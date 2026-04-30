import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

    // Build direct search URLs for each platform
    const platformLinks = buildPlatformLinks(searchQuery);

    // Search using DuckDuckGo Lite
    const products: ProductResult[] = [];
    try {
      const ddgResults = await searchDuckDuckGoLite(searchQuery);
      for (const result of ddgResults) {
        const detectedPlatform = detectPlatform(result.url, result.title);
        const priceInfo = extractPrice(result.title + " " + result.snippet);
        products.push({
          id: `ddg-${hashStr(result.url)}`,
          name: cleanTitle(result.title),
          price: priceInfo.amount,
          priceFormatted: priceInfo.amount > 0 ? `$${priceInfo.amount.toFixed(2)}` : "Ver precio en tienda",
          platform: detectedPlatform.platform,
          platformName: detectedPlatform.name,
          url: result.url,
          image: result.imageUrl || "",
          rating: 0,
          isBestPrice: false,
        });
      }
    } catch (e) {
      console.error("[Search] DuckDuckGo Lite error:", e);
    }

    // Deduplicate by domain+path
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

    // Sort: with prices first, then by price
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
    // Even on error, return platform links so users can search manually
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

function buildPlatformLinks(searchQuery: string) {
  const encoded = encodeURIComponent(searchQuery);
  return [
    {
      name: "Amazon",
      platform: "amazon",
      color: "#FF9900",
      bgColor: "#FF990014",
      logo: "📦",
      searchUrl: `https://www.amazon.com/s?k=${encoded}`,
      shopUrl: `https://www.amazon.com/s?k=${encoded}`,
    },
    {
      name: "AliExpress",
      platform: "aliexpress",
      color: "#FF4747",
      bgColor: "#FF474714",
      logo: "🛍️",
      searchUrl: `https://www.aliexpress.com/wholesale?SearchText=${encoded}`,
      shopUrl: `https://www.aliexpress.com/wholesale?SearchText=${encoded}`,
    },
    {
      name: "SHEIN",
      platform: "shein",
      color: "#1A1A1A",
      bgColor: "#1A1A1A14",
      logo: "👗",
      searchUrl: `https://www.shein.com/${encoded}-c-2260.html`,
      shopUrl: `https://www.shein.com/${encoded}-c-2260.html`,
    },
    {
      name: "Temu",
      platform: "temu",
      color: "#FB6F20",
      bgColor: "#FB6F2014",
      logo: "🧡",
      searchUrl: `https://www.temu.com/search-result.html?search_key=${encoded}`,
      shopUrl: `https://www.temu.com/search-result.html?search_key=${encoded}`,
    },
    {
      name: "TikTok Shop",
      platform: "tiktok",
      color: "#FE2C55",
      bgColor: "#FE2C5514",
      logo: "🎵",
      searchUrl: `https://www.tiktok.com/search?q=${encoded}&type=product`,
      shopUrl: `https://www.tiktok.com/search?q=${encoded}&type=product`,
    },
    {
      name: "MercadoLibre",
      platform: "mercadolibre",
      color: "#FFE600",
      bgColor: "#FFE60014",
      logo: "🛒",
      searchUrl: `https://listado.mercadolibre.com/${encoded}`,
      shopUrl: `https://www.mercadolibre.com/${encoded}`,
    },
  ];
}

// Helper: fetch with timeout using AbortController (compatible with all Node.js versions)
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal as unknown as AbortSignal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// DuckDuckGo Lite HTML scraping using POST (more reliable from cloud servers)
async function searchDuckDuckGoLite(query: string): Promise<any[]> {
  const results: any[] = [];

  // Search with shopping-focused terms
  const searchTerms = [
    `${query} price buy`,
    `${query} best price`,
    `${query} site:amazon.com OR site:aliexpress.com OR site:temu.com`,
  ];

  for (const term of searchTerms) {
    try {
      // Use POST method (DDG Lite form submit) - harder to block than GET
      const formData = new URLSearchParams();
      formData.append("q", term);

      const res = await fetchWithTimeout(
        `https://lite.duckduckgo.com/lite/`,
        {
          method: "POST",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
            "Content-Type": "application/x-www-form-urlencoded",
            Origin: "https://lite.duckduckgo.com",
            Referer: "https://lite.duckduckgo.com/",
          },
          body: formData.toString(),
        },
        15000
      );

      if (!res.ok) continue;

      const html = await res.text();
      console.log("[Search] DDG Lite response length:", html.length);

      // Method 1: Parse <tr> rows (standard DDG Lite format)
      const allRows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
      
      for (let i = 0; i < allRows.length - 2; i++) {
        const row = allRows[i];

        // Look for DDG redirect links (uddg=)
        const linkMatch = row.match(/<a[^>]+href="([^"]*(?:uddg=)[^"]*)"[^>]*>([\s\S]*?)<\/a>/);
        if (!linkMatch) continue;

        const rawUrl = linkMatch[1];
        const titleHtml = linkMatch[2];

        // Decode the uddg parameter
        let decodedUrl = "";
        try {
          const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            decodedUrl = decodeURIComponent(uddgMatch[1]);
          }
        } catch {}

        if (!decodedUrl || decodedUrl.includes("duckduckgo.com")) continue;

        const title = titleHtml
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&nbsp;/g, " ")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .trim();

        // Get snippet from next row
        let snippet = "";
        if (i + 1 < allRows.length) {
          const nextRow = allRows[i + 1];
          const snippetText = nextRow
            .replace(/<[^>]*>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&nbsp;/g, " ")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .trim();
          if (snippetText && !snippetText.startsWith("www.") && !snippetText.startsWith("http") && snippetText.length > 20) {
            snippet = snippetText;
          }
        }

        if (title && decodedUrl) {
          results.push({ url: decodedUrl, title, snippet, imageUrl: "" });
        }
      }

      // Method 2: If no <tr> results, try finding all links with uddg=
      if (results.length === 0) {
        const allLinks = html.match(/<a[^>]+href="([^"]*(?:uddg=)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g) || [];
        for (const linkHtml of allLinks) {
          const lm = linkHtml.match(/href="([^"]*(?:uddg=)[^"]*)"[^>]*>([\s\S]*?)<\/a>/);
          if (!lm) continue;

          let decodedUrl = "";
          try {
            const uddgMatch = lm[1].match(/uddg=([^&]+)/);
            if (uddgMatch) decodedUrl = decodeURIComponent(uddgMatch[1]);
          } catch {}

          if (!decodedUrl || decodedUrl.includes("duckduckgo.com")) continue;

          const title = lm[2]
            .replace(/<[^>]*>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&nbsp;/g, " ")
            .trim();

          if (title && title.length > 5) {
            results.push({ url: decodedUrl, title, snippet: "", imageUrl: "" });
          }
        }
      }

      // Method 3: Try finding direct links to shopping domains
      if (results.length === 0) {
        const shoppingDomains = [
          "amazon.com", "aliexpress.com", "shein.com", "temu.com",
          "tiktok.com", "mercadolibre.com", "ebay.com", "walmart.com",
        ];
        
        const allHrefs = html.match(/href="(https?:\/\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g) || [];
        for (const linkHtml of allHrefs) {
          const hm = linkHtml.match(/href="(https?:\/\/([^"]*))"[^>]*>([\s\S]*?)<\/a>/);
          if (!hm) continue;
          
          const url = hm[1].replace(/&amp;/g, "&");
          const title = hm[3].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
          
          if (title && title.length > 10 && shoppingDomains.some(d => url.includes(d))) {
            results.push({ url, title, snippet: "", imageUrl: "" });
          }
        }
      }

      console.log("[Search] DDG Lite found", results.length, "results for:", term);
      if (results.length > 0) break;
    } catch (e) {
      console.error("[Search] DDG Lite error for term:", term, e);
      continue;
    }
  }

  return results;
}

function detectPlatform(url: string, title: string): { platform: string; name: string } {
  const patterns: Array<{ re: RegExp; platform: string; name: string }> = [
    { re: /amazon\./i, platform: "amazon", name: "Amazon" },
    { re: /mercadolibre|mercadolivre/i, platform: "mercadolibre", name: "MercadoLibre" },
    { re: /aliexpress/i, platform: "aliexpress", name: "AliExpress" },
    { re: /temu/i, platform: "temu", name: "Temu" },
    { re: /shein/i, platform: "shein", name: "SHEIN" },
    { re: /tiktok/i, platform: "tiktok", name: "TikTok Shop" },
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
  const patterns = [
    /\$\s?([\d,]+\.?\d*)/g,
    /USD\s?([\d,]+\.?\d*)/gi,
    /([\d,]+\.?\d*)\s?USD/gi,
    /([\d,]+\.?\d*)\s?EUR/gi,
    /€\s?([\d,]+\.?\d*)/g,
    /R\$\s?([\d,]+\.?\d*)/g,
    /COP\s?\$\s?([\d,]+\.?\d*)/gi,
    /MXN\s?\$\s?([\d,]+\.?\d*)/gi,
  ];

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
  let clean = title
    .replace(/\s*[-|–—]\s*(Amazon|AliExpress|Temu|SHEIN|MercadoLibre|TikTok|eBay|Walmart).*$/i, "")
    .replace(/\s*[-|–—]\s*$/, "")
    .replace(/<[^>]*>/g, "")
    .trim();
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
    return `Encontramos ${results.length} resultado(s) en ${platformNames.join(", ")}. Los precios se muestran directamente en cada tienda — haz clic para verlos.`;
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
