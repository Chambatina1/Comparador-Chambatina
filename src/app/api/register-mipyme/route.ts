import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROXY_URLS = [
  process.env.PROXY_URL,
  "https://blind-workstation-trucks-hired.trycloudflare.com",
].filter(Boolean);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    for (const base of PROXY_URLS) {
      try {
        const res = await fetch(`${base}/mipyme`, {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(30000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        }
      } catch {}
    }

    return NextResponse.json({ error: "No se pudo conectar con el servidor" }, { status: 503 });
  } catch (err) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
