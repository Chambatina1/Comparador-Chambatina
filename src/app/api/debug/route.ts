import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const tests: Record<string, string> = {};

  // Test 1: Module import
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    tests["import"] = "OK";
  } catch (e: any) {
    tests["import"] = "FAIL: " + e.message;
    return NextResponse.json({ ok: false, tests, error: "SDK import failed" });
  }

  // Test 2: SDK create
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    tests["create"] = "OK";
  } catch (e: any) {
    tests["create"] = "FAIL: " + e.message;
    return NextResponse.json({ ok: false, tests, error: "SDK create failed" });
  }

  // Test 3: Web search
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const results = await zai.functions.invoke("web_search", {
      query: "AirPods Pro price",
      num: 3,
    });
    tests["web_search"] = "OK - " + (Array.isArray(results) ? results.length + " results" : "non-array");
    tests["sample"] = JSON.stringify(results).substring(0, 300);
  } catch (e: any) {
    tests["web_search"] = "FAIL: " + e.message;
  }

  // Test 4: Chat
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: "Responde con una sola palabra." },
        { role: "user", content: "Hola" },
      ],
    });
    const reply = completion.choices?.[0]?.message?.content || "no reply";
    tests["chat"] = "OK - " + reply;
  } catch (e: any) {
    tests["chat"] = "FAIL: " + e.message;
  }

  return NextResponse.json({ ok: true, tests });
}
