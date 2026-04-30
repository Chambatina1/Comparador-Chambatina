export interface Platform {
  id: string;
  name: string;
  domain: string;
  color: string;
  bgColor: string;
  searchUrlTemplate: string;
  logo: string; // emoji fallback
}

export const platforms: Platform[] = [
  {
    id: "tiktok",
    name: "TikTok Shop",
    domain: "tiktok.com",
    color: "#FE2C55",
    bgColor: "#FE2C5514",
    searchUrlTemplate: "https://www.tiktok.com/search?q={query}",
    logo: "🎵",
  },
  {
    id: "amazon",
    name: "Amazon",
    domain: "amazon.com",
    color: "#FF9900",
    bgColor: "#FF990014",
    searchUrlTemplate: "https://www.amazon.com/s?k={query}",
    logo: "📦",
  },
  {
    id: "aliexpress",
    name: "AliExpress",
    domain: "aliexpress.com",
    color: "#FF4747",
    bgColor: "#FF474714",
    searchUrlTemplate: "https://www.aliexpress.com/wholesale?SearchText={query}",
    logo: "🛍️",
  },
  {
    id: "shein",
    name: "SHEIN",
    domain: "shein.com",
    color: "#1A1A1A",
    bgColor: "#1A1A1A14",
    searchUrlTemplate: "https://www.shein.com/wholesale-{query}-c-2260.html",
    logo: "👗",
  },
  {
    id: "temu",
    name: "Temu",
    domain: "temu.com",
    color: "#FB6930",
    bgColor: "#FB693014",
    searchUrlTemplate: "https://www.temu.com/search-result.html?search_key={query}",
    logo: "🛒",
  },
  {
    id: "mercadolibre",
    name: "MercadoLibre",
    domain: "mercadolibre.com",
    color: "#FFE600",
    bgColor: "#FFE60014",
    searchUrlTemplate: "https://listado.mercadolibre.com/{query}",
    logo: "🏪",
  },
];

export function getPlatformById(id: string): Platform | undefined {
  return platforms.find((p) => p.id === id);
}

export function detectPlatformFromUrl(url: string): Platform | undefined {
  const lowerUrl = url.toLowerCase();
  return platforms.find((p) => lowerUrl.includes(p.domain));
}

export const trendingSearches = [
  "AirPods Pro",
  "Camiseta Nike",
  "Funda iPhone 15",
  "Zapatillas Adidas",
  "Smartwatch",
  "Cargador USB-C",
  "Mochila Laptop",
  "Auriculares Bluetooth",
];
