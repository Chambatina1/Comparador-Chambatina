import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Grupos de ventas por provincia y municipio principales de Cuba
// Los grupos reales de Facebook se llaman "Ventas [nombre]"
const GRUPOS_VENTAS: string[] = [
  // Provincias
  "Ventas La Habana", "Ventas Pinar del Río", "Ventas Artemisa", "Ventas Mayabeque",
  "Ventas Matanzas", "Ventas Cienfuegos", "Ventas Villa Clara", "Ventas Sancti Spíritus",
  "Ventas Ciego de Ávila", "Ventas Camagüey", "Ventas Las Tunas", "Ventas Holguín",
  "Ventas Granma", "Ventas Santiago de Cuba", "Ventas Guantánamo",
  // Municipios principales
  "Ventas Cárdenas", "Ventas Santa Clara", "Ventas Bayamo", "Ventas Palma Soriano",
  "Ventas Manzanillo", "Ventas Morón", "Ventas Florida", "Ventas Nuevitas",
  "Ventas Gibara", "Ventas Puerto Padre", "Ventas Contramaestre", "Ventas San Luis",
  "Ventas Güines", "Ventas Batabanó", "Ventas Artemisa", "Ventas Mariel",
  "Ventas Cumanayagua", "Ventas Trinidad", "Ventas Remedios", "Ventas Placetas",
  "Ventas Sancti Spíritus", "Ventas Jatibonico", "Ventas Florida Camagüey",
  "Ventas Baracoa", "Ventas Moa", "Ventas Sagua de Tánamo", "Ventas San Antonio",
  "Ventas Bejucal", "Ventas Quivicán", "Ventas San José de las Lajas",
];

const PROVINCIAS_MAP: Record<string, string> = {
  "habana": "La Habana", "la habana": "La Habana", "havana": "La Habana",
  "pinar": "Pinar del Río", "pinar del rio": "Pinar del Río", "pinar del río": "Pinar del Río",
  "artemisa": "Artemisa", "mayabeque": "Mayabeque",
  "matanzas": "Matanzas", "cardenas": "Matanzas", "cárdenas": "Matanzas",
  "varadero": "Matanzas", "cienfuegos": "Cienfuegos", "cumanayagua": "Cienfuegos",
  "trinidad": "Sancti Spíritus",
  "villa clara": "Villa Clara", "santa clara": "Villa Clara", "remedios": "Villa Clara",
  "placetas": "Villa Clara", "sagua": "Villa Clara",
  "sancti": "Sancti Spíritus", "sancti spiritus": "Sancti Spíritus", "ssc": "Sancti Spíritus",
  "ciego": "Ciego de Ávila", "ciego de avila": "Ciego de Ávila", "morón": "Ciego de Ávila",
  "camaguey": "Camagüey", "camagüey": "Camagüey", "florida": "Camagüey",
  "nuevitas": "Camagüey", "esmeralda": "Camagüey",
  "las tunas": "Las Tunas", "puerto padre": "Las Tunas", "jobabo": "Las Tunas",
  "holguin": "Holguín", "holguín": "Holguín", "gibara": "Holguín", "moa": "Holguín",
  "banes": "Holguín", "sagua de tanamo": "Holguín", "sagua de tánamo": "Holguín",
  "granma": "Granma", "bayamo": "Granma", "manzanillo": "Granma",
  "jucaro": "Granma", "niquero": "Granma",
  "santiago": "Santiago de Cuba", "santiago de cuba": "Santiago de Cuba",
  "palma": "Santiago de Cuba", "palma soriano": "Santiago de Cuba",
  "contramaestre": "Santiago de Cuba", "san luis": "Santiago de Cuba",
  "mella": "Santiago de Cuba", "guama": "Santiago de Cuba",
  "guantanamo": "Guantánamo", "guantánamo": "Guantánamo", "baracoa": "Guantánamo",
  "isla": "Isla de la Juventud", "nueva gerona": "Isla de la Juventud",
  "güines": "Mayabeque", "guines": "Mayabeque",
  "batabano": "Mayabeque", "batabanó": "Mayabeque",
  "san jose": "Mayabeque", "san josé": "Mayabeque", "bejucal": "Mayabeque",
  "quivican": "Mayabeque", "quivicán": "Mayabeque", "melena": "Mayabeque",
  "mariel": "Artemisa", "san antonio": "Artemisa", "guanajay": "Artemisa",
  "caimito": "Artemisa", "alquízar": "Artemisa",
  "san cristobal": "Pinar del Río", "san cristóbal": "Pinar del Río",
  "consolacion": "Pinar del Río", "consolación del sur": "Pinar del Río",
  "viñales": "Pinar del Río", "vinales": "Pinar del Río",
  "los palacios": "Pinar del Río", "sandino": "Pinar del Río",
  "jatibonico": "Camagüey", "sibanicú": "Camagüey", "sibanicu": "Camagüey",
  "vertientes": "Camagüey", "minas": "Camagüey", "najasa": "Camagüey",
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
    const body = await request.json();
    const { query } = body;

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Escribe el producto que buscas" }, { status: 400 });
    }

    const searchQuery = query.trim();
    console.log("[CubaFinder] Buscando:", searchQuery);

    const products = await searchAllVentasGroups(searchQuery);

    // Marcar mejor precio
    const priced = products.filter((p) => p.price > 0);
    if (priced.length > 0) {
      const min = Math.min(...priced.map((p) => p.price));
      for (const p of products) p.isBestPrice = p.price > 0 && p.price === min;
    }

    // Ordenar: más barato primero
    const sorted = products.sort((a, b) => {
      if (a.price > 0 && b.price === 0) return -1;
      if (a.price === 0 && b.price > 0) return 1;
      if (a.price > 0 && b.price > 0) return a.price - b.price;
      return 0;
    });

    const provinces = [...new Set(products.filter((p) => p.province).map((p) => p.province))];
    const withPhone = products.filter((p) => p.phone).length;
    const withDate = products.filter((p) => p.publishDate).length;

    return NextResponse.json({
      query: searchQuery,
      results: sorted,
      totalResults: sorted.length,
      stats: { provinces, withPhone, withDate, pricedCount: priced.length, minPrice: priced.length > 0 ? Math.min(...priced.map((p) => p.price)) : 0 },
    });
  } catch (error) {
    console.error("[CubaFinder] Error:", error);
    return NextResponse.json({ query: "", results: [], totalResults: 0, stats: { provinces: [], withPhone: 0, withDate: 0, pricedCount: 0, minPrice: 0 } });
  }
}

// ===== BUSCAR EN TODOS LOS GRUPOS "VENTAS" DE CUBA =====
async function searchAllVentasGroups(query: string): Promise<CubaProduct[]> {
  const zai = await ZAI.create();
  const allProducts: CubaProduct[] = [];

  // Construir queries apuntando a grupos "Ventas [lugar]" en Facebook
  const searchQueries: string[] = [];

  // Query 1: General Cuba + Facebook
  searchQueries.push(`"${query}" grupo Ventas Cuba Facebook precio teléfono`);

  // Query 2-5: Provincias principales (4 grupos más grandes)
  searchQueries.push(`"${query}" "Ventas La Habana" Facebook precio`);
  searchQueries.push(`"${query}" "Ventas Santiago" OR "Ventas Holguín" Facebook precio`);
  searchQueries.push(`"${query}" "Ventas Villa Clara" OR "Ventas Camagüey" Facebook precio`);
  searchQueries.push(`"${query}" "Ventas Pinar" OR "Ventas Matanzas" Facebook precio`);

  // Query 6: Province medias
  searchQueries.push(`"${query}" "Ventas Granma" OR "Ventas Las Tunas" OR "Ventas Ciego" Facebook precio`);

  // Query 7: Revolico + otros sitios
  searchQueries.push(`"${query}" Revolico Cuba precio teléfono`);

  // Query 8: Marketplace + grupos adicionales
  searchQueries.push(`"${query}" marketplace Cuba Facebook grupo ventas`);

  console.log(`[CubaFinder] Ejecutando ${searchQueries.length} búsquedas en grupos Ventas...`);

  // Ejecutar en paralelo
  let allResults: any[] = [];
  const batchSize = 4;

  for (let i = 0; i < searchQueries.length; i += batchSize) {
    const batch = searchQueries.slice(i, i + batchSize);
    console.log(`[CubaFinder] Lote ${Math.floor(i / batchSize) + 1}`);

    const batchResults = await Promise.allSettled(
      batch.map(async (q) => {
        try {
          const results = await zai.functions.invoke("web_search", { query: q, num: 10 });
          return results || [];
        } catch {
          return [];
        }
      })
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled" && Array.isArray(r.value)) allResults.push(...r.value);
    }
  }

  // Deduplicar
  const seenUrls = new Set<string>();
  const unique = allResults.filter((r: any) => {
    const u = r.url || "";
    if (!u || seenUrls.has(u)) return false;
    seenUrls.add(u);
    return true;
  });

  console.log(`[CubaFinder] ${unique.length} resultados únicos`);

  if (unique.length === 0) return [];

  // ===== IA EXTRAER: precio, teléfono, fecha, provincia, municipio, grupo =====
  const contextText = unique.slice(0, 25).map((r: any, i: number) => {
    return `[${i + 1}]
Título: ${r.name || ""}
URL: ${r.url || ""}
Descripción: ${r.snippet || ""}
Sitio: ${r.host_name || ""}
Fecha: ${r.date || ""}`;
  }).join("\n\n");

  const prompt = `Analiza publicaciones de venta en Cuba de grupos Facebook tipo "Ventas La Habana", "Ventas Pinar", "Ventas Cárdenas", etc.

PRODUCTO: "${query}"

PUBLICACIONES:
${contextText}

GRUPOS DE VENTAS CUBANOS: ${GRUPOS_VENTAS.slice(0, 30).join(", ")}

INSTRUCCIONES:
- Busca publicaciones donde alguien venda "${query}" en Cuba
- Identifica el GRUPO (ej: "Ventas La Habana", "Ventas Pinar del Río", "Ventas Cárdenas")
- Extrae PRECIO en USD ($) o CUP
- Extrae TELÉFONO (cubanos: +53 5xxxxxxx, 5xxxxxxx, 53xxxx)
- Determina la PROVINCIA y MUNICIPIO basándote en el nombre del grupo
- Extrae FECHA de publicación si aparece

REGLAS:
- Si dice "$150" o "$150 USD" → price: 150, currency: "USD"
- Si dice "150 CUP" o "150 pesos" → price: 150, currency: "CUP"
- Teléfonos cubanos: 8 dígitos, empiezan con 5, o +53
- Provincia: derivada del grupo (ej "Ventas Pinar" → "Pinar del Río")
- NO inventes datos que no estén en el texto

JSON:
{"products":[{"name":"","price":0,"currency":"USD","phone":"","province":"","municipality":"","group":"","publishDate":"","url":"","notes":""}]}`;

  try {
    const ai = await zai.chat.completions.create({
      messages: [
        { role: "system", content: "Extrae datos de ventas Cuba. JSON solo. No inventes." },
        { role: "user", content: prompt },
      ],
    });

    const content = ai.choices[0]?.message?.content || "";
    console.log("[CubaFinder] AI:", content.substring(0, 200));

    let parsed: any;
    try {
      parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]); else return [];
    }

    for (const p of (parsed.products || [])) {
      if (!p.name && !p.url) continue;
      const price = typeof p.price === "number" ? p.price : parseFloat(String(p.price).replace(/[^\d.]/g, "")) || 0;
      const currency = String(p.currency || "USD").toUpperCase();

      allProducts.push({
        id: `cuba-${hashStr(p.url + p.name + (p.phone || ""))}`,
        name: String(p.name || "").substring(0, 150),
        price,
        priceFormatted: price > 0 ? `$${price.toLocaleString("es-CU")} ${currency}` : "Preguntar",
        currency,
        url: String(p.url || "#"),
        phone: formatPhone(String(p.phone || "")),
        province: resolveProvince(String(p.province || ""), String(p.municipality || ""), String(p.group || "")),
        municipality: String(p.municipality || "").trim(),
        group: String(p.group || "").trim(),
        publishDate: String(p.publishDate || "").trim(),
        isBestPrice: false,
        notes: String(p.notes || "").trim(),
      });
    }
  } catch (e) {
    console.error("[CubaFinder] AI error:", e);
  }

  return allProducts;
}

function formatPhone(phone: string): string {
  if (!phone || phone.length < 3) return "";
  let c = phone.replace(/[^\d+]/g, "");
  if (c.length === 8 && c.startsWith("5")) c = "+53 " + c;
  else if (c.length === 10 && c.startsWith("53")) c = "+" + c;
  else if (c.length === 11 && c.startsWith("53")) c = "+" + c;
  return c;
}

function resolveProvince(province: string, municipality: string, group: string): string {
  const text = `${province} ${municipality} ${group}`.toLowerCase();
  for (const [key, value] of Object.entries(PROVINCIAS_MAP)) {
    if (text.includes(key)) return value;
  }
  return province.trim() || "";
}

function hashStr(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash).toString(36);
}
