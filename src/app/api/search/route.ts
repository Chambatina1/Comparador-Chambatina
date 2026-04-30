import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROXY_URLS = [
  process.env.PROXY_URL,
  "https://blind-workstation-trucks-hired.trycloudflare.com",
].filter(Boolean);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Error" }, { status: 400 });

    const query = body?.query || "";
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Escribe el producto que buscas" }, { status: 400 });
    }

    console.log("[API] Search:", query.trim());

    // Try proxy URLs
    for (const proxyUrl of PROXY_URLS) {
      try {
        console.log("[API] Trying proxy:", proxyUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`${proxyUrl}/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({ query: query.trim() }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          console.log("[API] Proxy returned", data.totalResults, "results via", proxyUrl);
          return NextResponse.json(data);
        } else {
          const text = await response.text().catch(() => "");
          console.log("[API] Proxy", proxyUrl, "status:", response.status, "body:", text.substring(0, 200));
        }
      } catch (fetchError: any) {
        console.log("[API] Proxy", proxyUrl, "failed:", fetchError.message?.substring(0, 100));
      }
    }

    // Fallback: try Bing search directly
    console.log("[API] All proxies failed, trying Bing fallback...");
    const bingResults = await searchBingFallback(query.trim());
    if (bingResults.results.length > 0) {
      console.log("[API] Bing fallback returned", bingResults.totalResults, "results");
      return NextResponse.json(bingResults);
    }

    return NextResponse.json({
      query: query.trim(),
      results: [],
      totalResults: 0,
      stats: { provinces: [], withPhone: 0, withDate: 0, pricedCount: 0, minPrice: 0, method: "no-results" },
    });
  } catch (error) {
    console.error("[API] Fatal error:", error);
    return NextResponse.json({
      query: "",
      results: [],
      totalResults: 0,
      stats: { provinces: [], withPhone: 0, withDate: 0, pricedCount: 0, minPrice: 0, method: "error" },
    });
  }
}

// Bing fallback - basic search if proxy is down
async function searchBingFallback(query: string) {
  try {
    const encoded = encodeURIComponent(`${query} Cuba precio venta`);
    const resp = await fetch(`https://www.bing.com/search?q=${encoded}&count=10&setlang=es&cc=cu`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await resp.text();
    const blocks = html.split(/<li class="b_algo"/);

    const results = [];
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
          } catch {}
        }

        let host = "";
        try { host = new URL(realUrl).hostname.replace("www.", ""); } catch {}
        if (host.includes("bing.com")) continue;

        // Extract price
        const text = `${title} ${snippet}`;
        const priceMatch = text.match(/\$\s*([\d,]+\.?\d*)/);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) || 0 : 0;

        // Extract province
        const provinces: [string, string][] = [
          ["la habana", "La Habana"], ["havana", "La Habana"],
          ["pinar del río", "Pinar del Río"], ["pinar del rio", "Pinar del Río"], ["pinar", "Pinar del Río"],
          ["matanzas", "Matanzas"], ["villa clara", "Villa Clara"],
          ["camagüey", "Camagüey"], ["camaguey", "Camagüey"],
          ["holguín", "Holguín"], ["holguin", "Holguín"],
          ["santiago de cuba", "Santiago de Cuba"], ["santiago", "Santiago de Cuba"],
          ["guantánamo", "Guantánamo"], ["guantanamo", "Guantánamo"],
          ["granma", "Granma"], ["ciego de ávila", "Ciego de Ávila"],
        ];
        let province = "";
        for (const [key, value] of provinces) {
          if (text.toLowerCase().includes(key)) { province = value; break; }
        }

        // Extract phone
        const phoneMatch = text.match(/\+53\s*[56]\d{7}/) || text.match(/53\s*[56]\d{7}/);
        let phone = phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, "") : "";

        results.push({
          id: `bing-${results.length}`,
          name: title.substring(0, 120),
          price,
          priceFormatted: price > 0 ? `$${price.toLocaleString("es-CU")} USD` : "Ver publicación",
          currency: "USD",
          url: realUrl,
          phone,
          province,
          municipality: "",
          group: host.includes("facebook") ? "Facebook" : host.includes("revolico") ? "Revolico" : host,
          publishDate: "",
          isBestPrice: false,
          notes: snippet.substring(0, 200),
        });
      } catch { continue; }
    }

    const priced = results.filter(r => r.price > 0);
    if (priced.length > 0) {
      const min = Math.min(...priced.map(r => r.price));
      results.forEach(r => { r.isBestPrice = r.price > 0 && r.price === min; });
    }

    return {
      query,
      results,
      totalResults: results.length,
      stats: {
        provinces: [...new Set(results.filter(r => r.province).map(r => r.province))],
        withPhone: results.filter(r => r.phone).length,
        withDate: 0,
        pricedCount: priced.length,
        minPrice: priced.length > 0 ? Math.min(...priced.map(r => r.price)) : 0,
        method: "Bing fallback",
      },
    };
  } catch {
    return { query, results: [], totalResults: 0, stats: { provinces: [], withPhone: 0, withDate: 0, pricedCount: 0, minPrice: 0, method: "error" } };
  }
}
