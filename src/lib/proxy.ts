// Centralized proxy URL config
// The PROXY_URL is used server-side for API routes and client-side for images only
export const PROXY_URL =
  process.env.NEXT_PUBLIC_PROXY_URL ||
  "https://blind-workstation-trucks-hired.trycloudflare.com";

// Client-side fetch goes through our own Next.js API routes (no direct proxy calls from browser)
export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res;
}

// For multipart form data uploads (goes through our API route)
export async function apiUpload(path: string, formData: FormData) {
  const res = await fetch(path, {
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
