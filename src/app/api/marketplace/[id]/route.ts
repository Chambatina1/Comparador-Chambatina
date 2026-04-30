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
  return new Response(JSON.stringify({ error: "not-found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await proxyFetch(`/listing/${id}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
