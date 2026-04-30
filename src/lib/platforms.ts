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
  {
    id: "samsung",
    name: "Samsung",
    domain: "samsung.com",
    color: "#1428A0",
    bgColor: "#1428A014",
    searchUrlTemplate: "https://www.samsung.com/us/search/?searchvalue={query}",
    logo: "📱",
  },
  {
    id: "ebay",
    name: "eBay",
    domain: "ebay.com",
    color: "#E53238",
    bgColor: "#E5323814",
    searchUrlTemplate: "https://www.ebay.com/sch/i.html?_nkw={query}",
    logo: "🏷️",
  },
  {
    id: "walmart",
    name: "Walmart",
    domain: "walmart.com",
    color: "#0071DC",
    bgColor: "#0071DC14",
    searchUrlTemplate: "https://www.walmart.com/search?q={query}",
    logo: "🛒",
  },
  {
    id: "bestbuy",
    name: "Best Buy",
    domain: "bestbuy.com",
    color: "#0046BE",
    bgColor: "#0046BE14",
    searchUrlTemplate: "https://www.bestbuy.com/site/searchpage.jsp?st={query}",
    logo: "🏷️",
  },
  {
    id: "target",
    name: "Target",
    domain: "target.com",
    color: "#CC0000",
    bgColor: "#CC000014",
    searchUrlTemplate: "https://www.target.com/s?searchTerm={query}",
    logo: "🎯",
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
  "EcoFlow Delta 2",
  "AirPods Pro",
  "Camiseta Nike",
  "iPhone 15",
  "Zapatillas Adidas",
  "Smartwatch",
  "Cargador USB-C",
  "Auriculares Bluetooth",
  "Xiaomi Robot Vacuum",
  "Laptop Gamer",
];
