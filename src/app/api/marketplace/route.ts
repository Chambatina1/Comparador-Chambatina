import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROXY_URLS = [
  process.env.PROXY_URL,
  "https://blind-workstation-trucks-hired.trycloudflare.com",
].filter(Boolean);

async function proxyFetch(path: string): Promise<Response> {
  for (const base of PROXY_URLS) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return res;
    } catch {}
  }
  return new Response(JSON.stringify({ listings: [], total: 0 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = `/listings?${searchParams.toString()}`;
  const res = await proxyFetch(path);
  const data = await res.json();
  return NextResponse.json(data);
}
