import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const imageUrl = formData.get("imageUrl") as string | null;

    if (!file && !imageUrl) {
      return NextResponse.json(
        { error: "Se requiere una imagen o una URL de imagen" },
        { status: 400 }
      );
    }

    let imageInput: { type: "image_url"; image_url: { url: string } };

    if (file) {
      // Convert file to base64
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = file.type || "image/jpeg";
      imageInput = {
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` },
      };
    } else {
      imageInput = {
        type: "image_url",
        image_url: { url: imageUrl! },
      };
    }

    const zai = await ZAI.create();

    const response = await zai.chat.completions.create({
      model: "default",
      messages: [
        {
          role: "system",
          content: `Eres un experto en identificación de productos para e-commerce. 
Analiza la imagen del producto y proporciona:
1. Nombre del producto (2-5 palabras ideal para búsqueda)
2. Categoría del producto
3. Descripción breve (1 oración)
4. Palabras clave adicionales para búsqueda

Responde en formato JSON válido:
{
  "productName": "...",
  "category": "...",
  "description": "...",
  "keywords": ["...", "..."]
}`,
        },
        {
          role: "user",
          content: [
            imageInput,
            {
              type: "text",
              text: "Analiza este producto. Identifica qué es, su marca si es visible, y proporciona un nombre de búsqueda óptimo.",
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "";

    // Try to parse as JSON, fallback to extracting product name
    try {
      const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      return NextResponse.json({
        productName: parsed.productName || "",
        category: parsed.category || "",
        description: parsed.description || "",
        keywords: parsed.keywords || [],
        rawResponse: content,
      });
    } catch {
      // Fallback: use the raw text as product name
      return NextResponse.json({
        productName: content.substring(0, 100).trim(),
        category: "General",
        description: content.substring(0, 200),
        keywords: content.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 5),
        rawResponse: content,
      });
    }
  } catch (error) {
    console.error("Image analysis error:", error);
    return NextResponse.json(
      { error: "Error al analizar la imagen. Intenta con otra imagen o escribe el nombre del producto." },
      { status: 500 }
    );
  }
}
