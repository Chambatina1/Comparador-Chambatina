// Centralized proxy URL config
export const PROXY_URL =
  process.env.NEXT_PUBLIC_PROXY_URL ||
  "https://blind-workstation-trucks-hired.trycloudflare.com";

export async function proxyFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${PROXY_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res;
}

// For multipart form data (file uploads), no Content-Type header
export async function proxyUpload(path: string, formData: FormData) {
  const res = await fetch(`${PROXY_URL}${path}`, {
    method: "POST",
    body: formData,
  });
  return res;
}

// Helper to resolve image URLs from the proxy
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${PROXY_URL}${path}`;
}

// Category labels in Spanish
export const CATEGORY_LABELS: Record<string, string> = {
  tecnologia: "Tecnología",
  electrodomesticos: "Electrodomésticos",
  transporte: "Transporte",
  inmobiliaria: "Inmobiliaria",
  servicios: "Servicios",
  alimentos: "Alimentos",
  ropa: "Ropa",
  construccion: "Construcción",
  salud: "Salud",
  general: "General",
};

// All categories for fallback
export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);
