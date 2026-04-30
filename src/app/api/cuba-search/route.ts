import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Grupos de Facebook Cuba "Ventas [Lugar]" y marketplaces
const GRUPOS_VENTAS: string[] = [
  "Ventas La Habana", "Ventas Pinar del Río", "Ventas Artemisa", "Ventas Mayabeque",
  "Ventas Matanzas", "Ventas Cienfuegos", "Ventas Villa Clara", "Ventas Sancti Spíritus",
  "Ventas Ciego de Ávila", "Ventas Camagüey", "Ventas Las Tunas", "Ventas Holguín",
  "Ventas Granma", "Ventas Santiago de Cuba", "Ventas Guantánamo", "Ventas Isla de Juventud",
  "Ventas Cárdenas", "Ventas Santa Clara", "Ventas Bayamo", "Ventas Morón",
  "Ventas Gibara", "Ventas Puerto Padre", "Ventas Contramaestre", "Ventas Trinidad",
  "Ventas Baracoa", "Ventas Moa",
];

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

async function webSearch(zai: any, query: string): Promise<any[]> {
  try {
    const r = await zai.functions.invoke("web_search", { query, num: 10 });
    return r || [];
  } catch (e) {
    console.error("[CubaProxy] web_search error:", e);
    return [];
  }
}

async function aiExtract(zai: any, query: string, results: any[]): Promise<CubaProduct[]> {
  if (results.length === 0) return [];

  const context = results.slice(0, 20).map((r: any, i: number) => {
    return `[${i + 1}]
Título: ${r.name || ""}
URL: ${r.url || ""}
Descripción: ${r.snippet || ""}
Sitio: ${r.host_name || ""}
Fecha: ${r.date || ""}`;
  }).join("\n\n");

  const prompt = `Eres un buscador experto de ventas en Cuba. Analiza estos resultados y extrae productos relacionados con "${query}" que se venden en Cuba, especialmente en grupos de Facebook tipo "Ventas La Habana", "Ventas Pinar", etc.

PRODUCTO BUSCADO: "${query}"

PUBLICACIONES ENCONTRADAS:
${context}

GRUPOS DE VENTAS CUBANOS: ${GRUPOS_VENTAS.slice(0, 20).join(", ")}

INSTRUCCIONES:
- Busca publicaciones donde alguien venda "${query}" en Cuba
- Identifica el GRUPO (ej: "Ventas La Habana", "Ventas Pinar del Río", "Revolico")
- Extrae PRECIO en USD ($) o CUP
- Extrae TELÉFONO (cubanos: +53 5xxxxxxx, 5xxxxxxx, 53xxxx)
- Determina la PROVINCIA basándote en el grupo o contenido
- Extrae FECHA de publicación si aparece
- Si una publicación NO es de venta en Cuba o no es relevante, EXCLÚYELA

REGLAS:
- "$150" o "$150 USD" → price: 150, currency: "USD"
- "150 CUP" o "150 pesos" → price: 150, currency: "CUP"
- Teléfonos cubanos: 8 dígitos, empiezan con 5, o +53
- NO inventes datos que no estén en el texto
- Si no hay resultados relevantes, devuelve array vacío

Responde SOLO con JSON:
{"products":[{"name":"","price":0,"currency":"USD","phone":"","province":"","municipality":"","group":"","publishDate":"","url":"","notes":""}]}`;

  try {
    const ai = await zai.chat.completions.create({
      messages: [
        { role: "system", content: "Extrae datos de ventas Cuba. JSON solo. No inventes." },
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
      else return [];
    }

    const products: CubaProduct[] = [];
    for (const p of parsed.products || []) {
      if (!p.name && !p.url) continue;
      const price = typeof p.price === "number" ? p.price : parseFloat(String(p.price).replace(/[^\d.]/g, "")) || 0;
      const currency = String(p.currency || "USD").toUpperCase();

      products.push({
        id: `cuba-${hashStr(p.url + p.name + (p.phone || ""))}`,
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
      });
    }
    return products;
  } catch (e) {
    console.error("[CubaProxy] AI error:", e);
    return [];
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

export async function GET(request: Request) {
  return new NextResponse("Cuba Search Proxy OK");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = body?.query || "";
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Query too short" }, { status: 400 });
    }

    console.log(`[CubaProxy] Searching: "${query}"`);
    const startTime = Date.now();

    const zai = await import("z-ai-web-dev-sdk").then((m: any) => m.default.create());

    // Run multiple searches in parallel
    const searchQueries = [
      `${query} Cuba precio venta Facebook`,
      `${query} "Ventas La Habana" OR "Ventas Pinar" OR "Ventas Holguin" precio`,
      `${query} "Ventas Villa Clara" OR "Ventas Camagüey" OR "Ventas Santiago" precio`,
      `${query} Revolico Cuba precio`,
      `${query} Bachecubano OR 1cuba OR DimeCuba Cuba venta`,
      `${query} Cuba marketplace compra venta USD CUP teléfono`,
    ];

    let allResults: any[] = [];
    const batchSize = 3;

    for (let i = 0; i < searchQueries.length; i += batchSize) {
      const batch = searchQueries.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((q: string) => webSearch(zai, q))
      );
      for (const r of results) {
        if (r.status === "fulfilled" && Array.isArray(r.value)) allResults.push(...r.value);
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    const unique = allResults.filter((r: any) => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    console.log(`[CubaProxy] ${unique.length} unique results in ${Date.now() - startTime}ms`);

    // AI extraction
    let products = await aiExtract(zai, query, unique);

    // If AI didn't find anything, return raw results
    if (products.length === 0 && unique.length > 0) {
      products = unique.slice(0, 10).map((r: any, i: number) => ({
        id: `raw-${i}`,
        name: r.name || "",
        price: 0,
        priceFormatted: "Ver publicación",
        currency: "USD",
        url: r.url || "#",
        phone: "",
        province: extractProvince(r.snippet || ""),
        municipality: "",
        group: extractGroup(r.host_name || ""),
        publishDate: r.date || "",
        isBestPrice: false,
        notes: r.snippet ? r.snippet.substring(0, 200) : "",
      }));
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
      query: query.trim(),
      results: sorted,
      totalResults: sorted.length,
      stats: {
        provinces,
        withPhone: products.filter((p) => p.phone).length,
        withDate: products.filter((p) => p.publishDate).length,
        pricedCount: priced.length,
        minPrice: priced.length > 0 ? Math.min(...priced.map((p) => p.price)) : 0,
      },
    });
  } catch (error) {
    console.error("[CubaProxy] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function extractProvince(text: string): string {
  const t = text.toLowerCase();
  const map: [string, string][] = [
    ["la habana", "La Habana"], ["habana", "La Habana"],
    ["pinar del río", "Pinar del Río"], ["pinar", "Pinar del Río"],
    ["artemisa", "Artemisa"], ["mayabeque", "Mayabeque"],
    ["matanzas", "Matanzas"], ["cienfuegos", "Cienfuegos"],
    ["villa clara", "Villa Clara"], ["santa clara", "Villa Clara"],
    ["sancti spíritus", "Sancti Spíritus"], ["ciego de ávila", "Ciego de Ávila"],
    ["camagüey", "Camagüey"], ["las tunas", "Las Tunas"],
    ["holguín", "Holguín"], ["granma", "Granma"], ["bayamo", "Granma"],
    ["santiago de cuba", "Santiago de Cuba"], ["santiago", "Santiago de Cuba"],
    ["guantánamo", "Guantánamo"], ["isla de la juventud", "Isla de la Juventud"],
  ];
  for (const [key, val] of map) {
    if (t.includes(key)) return val;
  }
  return "";
}

function extractGroup(host: string): string {
  const h = (host || "").toLowerCase();
  if (h.includes("revolico")) return "Revolico";
  if (h.includes("bachecubano")) return "BacheCubano";
  if (h.includes("1cuba")) return "1Cuba";
  if (h.includes("dimecuba")) return "DimeCuba";
  if (h.includes("facebook.com") || h.includes("fb.com")) return "Grupo de Facebook";
  return host || "";
}
