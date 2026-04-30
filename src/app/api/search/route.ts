import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, imageUrl } = body;

    if (!query && !imageUrl) {
      return NextResponse.json(
        { error: "Se requiere un término de búsqueda o una imagen" },
        { status: 400 }
      );
    }

    let searchQuery = query;

    // If an image URL is provided, first analyze it to get a description
    if (imageUrl && !query) {
      const zai = await ZAI.create();
      const analysis = await zai.chat.completions.create({
        model: "default",
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente de compras. Describe el producto de la imagen en 2-5 palabras para buscarlo. Responde SOLO con las palabras de búsqueda, sin explicaciones.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
              {
                type: "text",
                text: "Describe este producto brevemente para buscarlo en tiendas online:",
              },
            ],
          },
        ],
      });
      searchQuery = analysis.choices[0]?.message?.content?.trim() || "";
    }

    if (!searchQuery) {
      return NextResponse.json(
        { error: "No se pudo identificar el producto de la imagen" },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    // Search queries for different platforms
    const searchQueries = [
      `${searchQuery} precio site:amazon.com OR site:mercadolibre.com`,
      `${searchQuery} comprar barato site:aliexpress.com OR site:temu.com`,
      `${searchQuery} precio oferta site:shein.com OR site:tiktok.com`,
    ];

    // Execute searches in parallel
    const searchPromises = searchQueries.map((q) =>
      zai.functions
        .invoke("web_search", {
          query: q,
          num: 10,
        })
        .catch(() => ({ results: [] }))
    );

    const searchResults = await Promise.all(searchPromises);

    // Parse and structure results
    const allResults = parseSearchResults(searchResults, searchQuery);

    // Sort by relevance and price
    const sortedResults = sortResults(allResults);

    // Generate price summary
    const summary = generateSummary(sortedResults);

    return NextResponse.json({
      query: searchQuery,
      results: sortedResults,
      summary,
      totalResults: sortedResults.length,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Error al buscar productos. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

interface RawSearchResult {
  title?: string;
  url?: string;
  description?: string;
  price?: string;
  results?: Array<{
    title?: string;
    url?: string;
    description?: string;
    price?: string;
    snippet?: string;
  }>;
}

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

function parseSearchResults(
  searchResults: RawSearchResult[],
  query: string
): ProductResult[] {
  const products: ProductResult[] = [];
  const seen = new Set<string>();

  const platformPatterns: Array<{
    pattern: RegExp;
    platform: string;
    platformName: string;
  }> = [
    { pattern: /amazon\./i, platform: "amazon", platformName: "Amazon" },
    {
      pattern: /mercadolibre|mercadolivre/i,
      platform: "mercadolibre",
      platformName: "MercadoLibre",
    },
    { pattern: /aliexpress/i, platform: "aliexpress", platformName: "AliExpress" },
    { pattern: /temu/i, platform: "temu", platformName: "Temu" },
    { pattern: /shein/i, platform: "shein", platformName: "SHEIN" },
    { pattern: /tiktok/i, platform: "tiktok", platformName: "TikTok Shop" },
  ];

  for (const result of searchResults) {
    const items = result.results || (result.title ? [result] : []);

    for (const item of items) {
      const title = item.title || item.description || "";
      const url = item.url || "";
      const snippet = item.snippet || item.description || "";

      if (!title || !url) continue;

      // Skip duplicates
      if (seen.has(url)) continue;
      seen.add(url);

      // Detect platform
      let detectedPlatform = "other";
      let detectedPlatformName = "Otra tienda";
      for (const pp of platformPatterns) {
        if (pp.pattern.test(url)) {
          detectedPlatform = pp.platform;
          detectedPlatformName = pp.platformName;
          break;
        }
      }

      // Extract price from title and snippet
      const priceInfo = extractPrice(title + " " + snippet);

      // Generate a clean product name
      const cleanName = extractProductName(title);

      products.push({
        id: generateId(url),
        name: cleanName,
        price: priceInfo.amount,
        priceFormatted: priceInfo.formatted,
        platform: detectedPlatform,
        platformName: detectedPlatformName,
        url,
        image: extractImageFromSnippet(snippet),
        rating: extractRating(snippet),
        isBestPrice: false,
      });
    }
  }

  // Mark best price
  const pricedProducts = products.filter((p) => p.price > 0);
  if (pricedProducts.length > 0) {
    const minPrice = Math.min(...pricedProducts.map((p) => p.price));
    for (const p of products) {
      p.isBestPrice = p.price > 0 && p.price === minPrice;
    }
  }

  return products;
}

function extractPrice(text: string): {
  amount: number;
  formatted: string;
} {
  // Match various price formats: $10.99, USD 10.99, 10.99 USD, MXN$10, etc.
  const pricePatterns = [
    /\$\s?([\d,]+\.?\d*)/g,
    /USD\s?([\d,]+\.?\d*)/gi,
    /([\d,]+\.?\d*)\s?USD/gi,
    /([\d,]+\.?\d*)\s?MXN/gi,
    /MXN\s?\$\s?([\d,]+\.?\d*)/gi,
    /S\/\.\s?([\d,]+\.?\d*)/g,
    /R\$\s?([\d,]+\.?\d*)/g,
    /€\s?([\d,]+\.?\d*)/g,
  ];

  let bestMatch = "";
  let bestAmount = 0;

  for (const pattern of pricePatterns) {
    pattern.lastIndex = 0;
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const numStr = match[1].replace(/,/g, "");
      const amount = parseFloat(numStr);
      if (amount > 0 && amount < 999999 && (!bestMatch || amount < bestAmount)) {
        bestAmount = amount;
        bestMatch = match[0].trim();
      }
    }
  }

  if (bestMatch) {
    return { amount: bestAmount, formatted: bestMatch };
  }

  return { amount: 0, formatted: "Ver precio" };
}

function extractProductName(title: string): string {
  // Clean up common prefixes/suffixes
  let name = title
    .replace(/[-_|]\s*(Amazon|AliExpress|Temu|SHEIN|MercadoLibre|TikTok Shop).*$/i, "")
    .replace(/\s*(Amazon|AliExpress|Temu|SHEIN|MercadoLibre|TikTok Shop).*$/i, "")
    .replace(/\s*-\s*.*$/, "")
    .trim();

  // Limit length
  if (name.length > 100) {
    name = name.substring(0, 97) + "...";
  }

  return name || title.substring(0, 80);
}

function extractImageFromSnippet(snippet: string): string {
  // Return empty - we'll use placeholder images
  return "";
}

function extractRating(snippet: string): number {
  const ratingMatch = snippet.match(/(\d+\.?\d*)\s*(?:de\s*5|estrellas|stars)/i);
  if (ratingMatch) {
    return Math.min(5, Math.max(0, parseFloat(ratingMatch[1])));
  }
  return 0;
}

function generateId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function sortResults(results: ProductResult[]): ProductResult[] {
  return results.sort((a, b) => {
    // Put results with prices first
    if (a.price > 0 && b.price === 0) return -1;
    if (a.price === 0 && b.price > 0) return 1;
    // Sort by price ascending
    if (a.price > 0 && b.price > 0) return a.price - b.price;
    return 0;
  });
}

function generateSummary(results: ProductResult[]): string {
  const priced = results.filter((r) => r.price > 0);
  if (priced.length === 0) {
    return "No se encontraron precios para este producto en las plataformas analizadas.";
  }

  const min = Math.min(...priced.map((r) => r.price));
  const max = Math.max(...priced.map((r) => r.price));
  const cheapest = priced.find((r) => r.price === min);

  if (min === max) {
    return `El precio de este producto es consistente en todas las plataformas: $${min.toFixed(2)} en ${priced.length} tienda(s).`;
  }

  const savings = max - min;
  return `Este producto está entre $${min.toFixed(2)} y $${max.toFixed(2)}. El precio más bajo es en ${cheapest?.platformName || "una tienda"} por $${min.toFixed(2)} — ¡ahorrás hasta $${savings.toFixed(2)}!`;
}
