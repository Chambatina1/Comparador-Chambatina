import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, imageUrl, url } = body;

    if (!query && !imageUrl && !url) {
      return NextResponse.json(
        { error: "Escribe algo, pega un link o sube una foto" },
        { status: 400 }
      );
    }

    let searchQuery = query?.trim() || "";
    let sourceUrl = url?.trim() || "";

    // ============================================
    // 1. If user pasted a URL, extract product info from it
    // ============================================
    if (sourceUrl && !searchQuery) {
      const zai = await ZAI.create();
      try {
        // Try to extract product name from URL
        const urlAnalysis = await zai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `Eres un experto en e-commerce. El usuario te da una URL de un producto.
Tu trabajo es:
1. Identificar el producto de la URL
2. Devolver SOLO el nombre del producto en 3-8 palabras optimizado para buscar
3. Si no puedes identificar el producto, devuelve un nombre de búsqueda genérico basado en la URL
Responde SOLO con las palabras de búsqueda, nada más.`,
            },
            {
              role: "user",
              content: `URL: ${sourceUrl}\n\n¿Qué producto es este? Dime el nombre para buscarlo.`,
            },
          ],
        });
        searchQuery = urlAnalysis.choices[0]?.message?.content?.trim() || "";
      } catch {
        // Fallback: extract from URL path
        const urlPath = new URL(sourceUrl).pathname;
        searchQuery = urlPath
          .replace(/[-_]/g, " ")
          .replace(/\/dp\/|\/item\/|\/p\//g, " ")
          .split("/")
          .filter((w) => w.length > 2)
          .slice(0, 6)
          .join(" ");
      }
    }

    // ============================================
    // 2. If user uploaded an image, analyze it
    // ============================================
    if (imageUrl && !searchQuery) {
      const zai = await ZAI.create();
      try {
        const analysis = await zai.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "Eres un experto en e-commerce. Describe el producto de la imagen en 3-6 palabras clave optimizadas para buscar en tiendas online. Responde SOLO con las palabras de búsqueda separadas por espacios, sin explicaciones.",
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
                  text: "Describe este producto brevemente para buscarlo:",
                },
              ],
            },
          ],
        });
        searchQuery = analysis.choices[0]?.message?.content?.trim() || "";
      } catch {
        searchQuery = "";
      }
    }

    if (!searchQuery) {
      return NextResponse.json(
        { error: "No se pudo identificar el producto. Intenta con una descripción." },
        { status: 400 }
      );
    }

    // ============================================
    // 3. Search across platforms using web search
    // ============================================
    const zai = await ZAI.create();

    // Individual platform searches (more effective than site: operators)
    const platformSearches = [
      { query: `${searchQuery} buy price Amazon`, platformHint: "amazon" },
      { query: `${searchQuery} comprar precio AliExpress`, platformHint: "aliexpress" },
      { query: `${searchQuery} SHEIN shopping price`, platformHint: "shein" },
      { query: `${searchQuery} Temu deal price`, platformHint: "temu" },
      { query: `${searchQuery} TikTok Shop price`, platformHint: "tiktok" },
      { query: `${searchQuery} MercadoLibre precio`, platformHint: "mercadolibre" },
      // General searches for broader results
      { query: `${searchQuery} best price comparison`, platformHint: "" },
      { query: `${searchQuery} cheapest online store`, platformHint: "" },
    ];

    const searchPromises = platformSearches.map((s) =>
      zai.functions
        .invoke("web_search", {
          query: s.query,
          num: 10,
        })
        .then((results: any) => ({
          results: results || [],
          platformHint: s.platformHint,
        }))
        .catch(() => ({ results: [], platformHint: s.platformHint }))
    );

    const searchResponses = await Promise.all(searchPromises);

    // ============================================
    // 4. Use AI to extract structured product data from results
    // ============================================
    const allSnippets: string[] = [];
    for (const response of searchResponses) {
      const items = Array.isArray(response.results) ? response.results : [];
      for (const item of items) {
        const title = item.name || item.title || "";
        const url = item.url || "";
        const snippet = item.snippet || item.description || "";
        if (title || url) {
          allSnippets.push(`TITLE: ${title} | URL: ${url} | ${snippet}`);
        }
      }
    }

    // Use AI to parse results into structured products
    let products: ProductResult[] = [];

    if (allSnippets.length > 0) {
      try {
        const aiParse = await zai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `Eres un extractor de datos de productos. Dado un texto con resultados de búsqueda web, extrae productos reales con sus precios.

Plataformas válidas: amazon, aliexpress, shein, temu, tiktok, mercadolibre, otra

IMPORTANTE:
- Solo incluye resultados que sean productos reales con precio
- Si el precio no es claro, pon 0
- Si no hay resultados con precio, devuelve un array vacío []
- Responde SOLO con JSON válido, sin markdown, sin explicaciones
- Máximo 15 productos

Formato JSON:
[{"name":"nombre del producto","price":29.99,"platform":"amazon","url":"https://..."}]`,
            },
            {
              role: "user",
              content: `Buscando: "${searchQuery}"\n\nResultados:\n${allSnippets.slice(0, 30).join("\n")}`,
            },
          ],
        });

        let aiContent = aiParse.choices[0]?.message?.content?.trim() || "[]";
        // Clean markdown code blocks if present
        aiContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        const parsed = JSON.parse(aiContent);
        if (Array.isArray(parsed)) {
          products = parsed.map((p: any, i: number) => ({
            id: `prod-${i}-${Date.now()}`,
            name: p.name || "Producto",
            price: typeof p.price === "number" ? p.price : 0,
            priceFormatted:
              p.price > 0 ? `$${p.price.toFixed(2)}` : "Ver precio",
            platform: p.platform || "otra",
            platformName: getPlatformName(p.platform),
            url: p.url || "#",
            image: p.image || "",
            rating: p.rating || 0,
            isBestPrice: false,
          }));
        }
      } catch (parseErr) {
        console.error("[Search] AI parse error:", parseErr);
        // Fallback: use raw results
        products = extractFromRawResults(searchResponses, searchQuery);
      }
    }

    // If AI couldn't extract anything, use raw results
    if (products.length === 0) {
      products = extractFromRawResults(searchResponses, searchQuery);
    }

    // Sort and mark best price
    const sorted = sortResults(products);
    const summary = generateSummary(sorted, searchQuery);

    return NextResponse.json({
      query: searchQuery,
      results: sorted,
      summary,
      totalResults: sorted.length,
    });
  } catch (error) {
    console.error("[Search] Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Error al buscar: " + errMsg },
      { status: 500 }
    );
  }
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

function getPlatformName(platform: string): string {
  const names: Record<string, string> = {
    amazon: "Amazon",
    aliexpress: "AliExpress",
    shein: "SHEIN",
    temu: "Temu",
    tiktok: "TikTok Shop",
    mercadolibre: "MercadoLibre",
    otra: "Otra tienda",
  };
  return names[platform?.toLowerCase()] || "Otra tienda";
}

function extractFromRawResults(
  searchResponses: any[],
  query: string
): ProductResult[] {
  const products: ProductResult[] = [];
  const seen = new Set<string>();

  const platformPatterns: Array<{
    pattern: RegExp;
    platform: string;
  }> = [
    { pattern: /amazon\./i, platform: "amazon" },
    { pattern: /mercadolibre|mercadolivre/i, platform: "mercadolibre" },
    { pattern: /aliexpress/i, platform: "aliexpress" },
    { pattern: /temu/i, platform: "temu" },
    { pattern: /shein/i, platform: "shein" },
    { pattern: /tiktok/i, platform: "tiktok" },
  ];

  for (const response of searchResponses) {
    const items = Array.isArray(response.results)
      ? response.results
      : [];
    for (const item of items) {
      const title = item.name || item.title || "";
      const itemUrl = item.url || "";
      const snippet = item.snippet || item.description || "";

      if (!title && !itemUrl) continue;
      if (seen.has(itemUrl)) continue;
      seen.add(itemUrl);

      // Detect platform from URL
      let platform = "otra";
      for (const pp of platformPatterns) {
        if (pp.pattern.test(itemUrl)) {
          platform = pp.platform;
          break;
        }
      }

      // Extract price
      const text = title + " " + snippet;
      const priceMatch = text.match(/\$\s?([\d,]+\.?\d*)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : 0;

      // Clean name
      let name = title
        .replace(/\s*[-|]\s*(Amazon|AliExpress|Temu|SHEIN|MercadoLibre|TikTok).*$/i, "")
        .trim();
      if (name.length > 100) name = name.substring(0, 97) + "...";

      products.push({
        id: `raw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name || query,
        price,
        priceFormatted: price > 0 ? `$${price.toFixed(2)}` : "Ver precio",
        platform,
        platformName: getPlatformName(platform),
        url: itemUrl,
        image: "",
        rating: 0,
        isBestPrice: false,
      });
    }
  }

  return products;
}

function sortResults(results: ProductResult[]): ProductResult[] {
  const platformOrder = ["amazon", "aliexpress", "shein", "temu", "tiktok", "mercadolibre", "otra"];

  return results.sort((a, b) => {
    // Products with prices first
    if (a.price > 0 && b.price === 0) return -1;
    if (a.price === 0 && b.price > 0) return 1;
    // Then by price ascending
    if (a.price > 0 && b.price > 0) return a.price - b.price;
    // Then by platform order
    const aIdx = platformOrder.indexOf(a.platform);
    const bIdx = platformOrder.indexOf(b.platform);
    return aIdx - bIdx;
  });
}

function generateSummary(results: ProductResult[], query: string): string {
  const priced = results.filter((r) => r.price > 0);

  if (priced.length === 0) {
    const platforms = [...new Set(results.map((r) => r.platformName))];
    if (platforms.length > 0) {
      return `Encontramos ${results.length} resultados para "${query}" en ${platforms.join(", ")}. Los precios no se pudieron extraer automáticamente — haz clic en "Ver precio" para ver el precio real en cada tienda.`;
    }
    return `No se encontraron resultados para "${query}" en las plataformas analizadas. Intenta con otro término de búsqueda.`;
  }

  const min = Math.min(...priced.map((r) => r.price));
  const max = Math.max(...priced.map((r) => r.price));
  const avg = priced.reduce((sum, r) => sum + r.price, 0) / priced.length;
  const cheapest = priced.find((r) => r.price === min);

  if (priced.length === 1) {
    return `Encontramos 1 resultado para "${query}" en ${cheapest?.platformName}: $${min.toFixed(2)}`;
  }

  const savings = max - min;
  return `Encontramos ${priced.length} precios para "${query}". Rango: $${min.toFixed(2)} - $${max.toFixed(2)} | Promedio: $${avg.toFixed(2)} | El más barato está en ${cheapest?.platformName} — ahorras hasta $${savings.toFixed(2)}`;
}
