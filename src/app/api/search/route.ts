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
    const platformLinks = [
      {
        name: "Amazon",
        platform: "amazon",
        color: "#FF9900",
        bgColor: "#FF990014",
        logo: "📦",
        searchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`,
        shopUrl: `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`,
      },
      {
        name: "AliExpress",
        platform: "aliexpress",
        color: "#FF4747",
        bgColor: "#FF474714",
        logo: "🛍️",
        searchUrl: `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(searchQuery)}`,
        shopUrl: `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(searchQuery)}`,
      },
      {
        name: "SHEIN",
        platform: "shein",
        color: "#1A1A1A",
        bgColor: "#1A1A1A14",
        logo: "👗",
        searchUrl: `https://www.shein.com/${encodeURIComponent(searchQuery)}-c-2260.html`,
        shopUrl: `https://www.shein.com/${encodeURIComponent(searchQuery)}-c-2260.html`,
      },
      {
        name: "Temu",
        platform: "temu",
        color: "#FB6F20",
        bgColor: "#FB6F2014",
        logo: "🧡",
        searchUrl: `https://www.temu.com/search-result.html?search_key=${encodeURIComponent(searchQuery)}`,
        shopUrl: `https://www.temu.com/search-result.html?search_key=${encodeURIComponent(searchQuery)}`,
      },
      {
        name: "TikTok Shop",
        platform: "tiktok",
        color: "#FE2C55",
        bgColor: "#FE2C5514",
        logo: "🎵",
        searchUrl: `https://www.tiktok.com/search?q=${encodeURIComponent(searchQuery)}&type=product`,
        shopUrl: `https://www.tiktok.com/search?q=${encodeURIComponent(searchQuery)}&type=product`,
      },
      {
        name: "MercadoLibre",
        platform: "mercadolibre",
        color: "#FFE600",
        bgColor: "#FFE60014",
        logo: "🛒",
        searchUrl: `https://listado.mercadolibre.com/${encodeURIComponent(searchQuery)}`,
        shopUrl: `https://www.mercadolibre.com/${encodeURIComponent(searchQuery)}`,
      },
    ];

    // Try multiple search sources
    const products: ProductResult[] = [];

    // Source 1: DuckDuckGo Lite
    try {
      const ddgResults = await searchDuckDuckGo(searchQuery);
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
      console.error("[Search] DuckDuckGo failed, trying Google...", e);
    }

    // Source 2: Google search scraping (fallback)
    if (products.length === 0) {
      try {
        const googleResults = await searchGoogle(searchQuery);
        for (const result of googleResults) {
          const detectedPlatform = detectPlatform(result.url, result.title);
          const priceInfo = extractPrice(result.title + " " + result.snippet);
          products.push({
            id: `ggl-${hashStr(result.url)}`,
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
        console.error("[Search] Google failed, trying Bing...", e);
      }
    }

    // Source 3: Bing search scraping (last resort)
    if (products.length === 0) {
      try {
        const bingResults = await searchBing(searchQuery);
        for (const result of bingResults) {
          const detectedPlatform = detectPlatform(result.url, result.title);
          const priceInfo = extractPrice(result.title + " " + result.snippet);
          products.push({
            id: `bng-${hashStr(result.url)}`,
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
        console.error("[Search] Bing failed too:", e);
      }
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

    // Always return success with results (even if empty) and platform links
    return NextResponse.json({
      query: searchQuery,
      results: sorted,
      platformLinks,
      summary,
      totalResults: sorted.length,
    });
  } catch (error) {
    console.error("[Search] Unexpected error:", error);
    // Even on error, return the platform links so users can search manually
    const fallbackQuery = (request.body && typeof request.body === "object" ? (request.body as any).query : "") || "";
    const encoded = encodeURIComponent(fallbackQuery || "producto");

    return NextResponse.json({
      query: fallbackQuery,
      results: [],
      platformLinks: [
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
      ],
      summary: `Busca directamente en cada tienda haciendo clic en los enlaces de abajo.`,
      totalResults: 0,
    });
  }
}

// Helper: create a fetch with timeout using AbortController (compatible with all Node.js versions)
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal as any,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// Source 1: DuckDuckGo Lite HTML scraping
async function searchDuckDuckGo(query: string): Promise<any[]> {
  const results: any[] = [];
  const encodedQuery = encodeURIComponent(query + " price buy");

  const res = await fetchWithTimeout(
    `https://html.duckduckgo.com/html/?q=${encodedQuery}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    },
    12000
  );

  if (!res.ok) return results;

  const html = await res.text();

  // Method 1: Standard DDG HTML result links
  const resultRegex =
    /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>.*?<a[^>]+class="result__snippet"[^>]*>(.*?)<\/a>/gs;
  const altRegex =
    /<a[^>]+rel="nofollow"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>.*?<td[^>]+class="result__snippet"[^>]*>(.*?)<\/td>/gs;

  const extractMatches = (regex: RegExp) => {
    let match;
    while ((match = regex.exec(html)) !== null) {
      const url = match[1].replace(/\/\/duckduckgo\.com\/l\//, "").replace(/uddg=([^&]*).*/, "$1");
      const decodedUrl = decodeURIComponent(url);
      const title = match[2].replace(/<[^>]*>/g, "").trim();
      const snippet = match[3].replace(/<[^>]*>/g, "").trim();

      if (title && decodedUrl && !decodedUrl.includes("duckduckgo.com")) {
        results.push({ url: decodedUrl, title, snippet, imageUrl: "" });
      }
    }
  };

  extractMatches(resultRegex);
  if (results.length === 0) extractMatches(altRegex);

  // Method 2: Find all links with /l/?uddg= pattern
  if (results.length === 0) {
    const linkRegex = /<a[^>]+href="([^"]*(?:uddg=|l\/)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      const rawUrl = m[1];
      const titleHtml = m[2];

      let decodedUrl = "";
      try {
        const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
        if (uddgMatch) {
          decodedUrl = decodeURIComponent(uddgMatch[1]);
        } else {
          decodedUrl = rawUrl;
        }
      } catch {
        decodedUrl = rawUrl;
      }

      const title = titleHtml.replace(/<[^>]*>/g, "").trim();
      if (title && decodedUrl && !decodedUrl.includes("duckduckgo.com") && decodedUrl.startsWith("http")) {
        results.push({ url: decodedUrl, title, snippet: "", imageUrl: "" });
      }
    }
  }

  // Method 3: Find all outbound links in the results area
  if (results.length === 0) {
    // Look for URLs that contain known shopping domains
    const shoppingDomains = [
      "amazon.com", "aliexpress.com", "shein.com", "temu.com",
      "tiktok.com", "mercadolibre.com", "ebay.com", "walmart.com",
      "bestbuy.com", "target.com", "etsy.com", "walmart.com"
    ];

    const allLinksRegex = /href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = allLinksRegex.exec(html)) !== null) {
      const rawUrl = m[1];
      const titleHtml = m[2];

      let finalUrl = rawUrl;
      // Decode DDG redirect URLs
      try {
        const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
        if (uddgMatch) {
          finalUrl = decodeURIComponent(uddgMatch[1]);
        }
      } catch {}

      const title = titleHtml.replace(/<[^>]*>/g, "").trim();
      if (title && title.length > 10 && finalUrl.startsWith("http")) {
        const isShopping = shoppingDomains.some((d) => finalUrl.includes(d));
        if (isShopping) {
          results.push({ url: finalUrl, title, snippet: "", imageUrl: "" });
        }
      }
    }
  }

  return results;
}

// Source 2: Google search scraping
async function searchGoogle(query: string): Promise<any[]> {
  const results: any[] = [];
  const searchTerms = [
    query + " price buy",
    query + " site:amazon.com OR site:aliexpress.com OR site:shein.com OR site:temu.com price",
  ];

  for (const term of searchTerms) {
    try {
      const res = await fetchWithTimeout(
        `https://www.google.com/search?q=${encodeURIComponent(term)}&num=15&hl=en`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
          },
        },
        10000
      );

      if (!res.ok) continue;

      const html = await res.text();

      // Google changed their HTML structure, try multiple patterns
      // Pattern 1: Standard search results
      const patterns = [
        // Modern Google: <a href="/url?q=..."> pattern
        /<a[^>]+href="\/url\?q=([^"&]+)&[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
        // Direct href to shopping sites
        /<a[^>]+href="(https?:\/\/(?:www\.)?(?:amazon|aliexpress|shein|temu|tiktok|mercadolibre|ebay|walmart|bestbuy)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
      ];

      for (const pattern of patterns) {
        let m;
        pattern.lastIndex = 0;
        while ((m = pattern.exec(html)) !== null) {
          let url = m[1];
          // Clean Google redirect URL
          url = url.replace(/&sa=.*$/, "").replace(/&usg=.*$/, "");
          if (url.startsWith("http") && !url.includes("google.com")) {
            const title = m[2].replace(/<[^>]*>/g, "").trim();
            if (title && title.length > 5) {
              results.push({ url, title, snippet: "", imageUrl: "" });
            }
          }
        }
        if (results.length > 0) break;
      }

      if (results.length > 0) break;
    } catch {
      continue;
    }
  }

  return results;
}

// Source 3: Bing search scraping
async function searchBing(query: string): Promise<any[]> {
  const results: any[] = [];

  try {
    const res = await fetchWithTimeout(
      `https://www.bing.com/search?q=${encodeURIComponent(query + " price buy")}&count=15`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
      10000
    );

    if (!res.ok) return results;

    const html = await res.text();

    // Bing result pattern
    const resultRegex =
      /<li[^>]+class="b_algo"[^>]*>[\s\S]*?<a[^>]+href="(https?:\/\/[^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g;

    let m;
    while ((m = resultRegex.exec(html)) !== null) {
      const url = m[1];
      const title = m[2].replace(/<[^>]*>/g, "").trim();
      const snippet = m[3].replace(/<[^>]*>/g, "").trim();
      if (title && url && !url.includes("bing.com") && !url.includes("microsoft.com")) {
        results.push({ url, title, snippet, imageUrl: "" });
      }
    }

    // Fallback: any links to shopping domains
    if (results.length === 0) {
      const shoppingDomains = [
        "amazon.com", "aliexpress.com", "shein.com", "temu.com",
        "tiktok.com", "mercadolibre.com", "ebay.com", "walmart.com",
        "bestbuy.com", "target.com", "etsy.com",
      ];

      const linkRegex = /<a[^>]+href="(https?:\/\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
      let m2;
      while ((m2 = linkRegex.exec(html)) !== null) {
        const url = m2[1];
        const title = m2[2].replace(/<[^>]*>/g, "").trim();
        if (title && title.length > 10 && shoppingDomains.some((d) => url.includes(d))) {
          results.push({ url, title, snippet: "", imageUrl: "" });
        }
      }
    }
  } catch (e) {
    console.error("[Search] Bing error:", e);
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
