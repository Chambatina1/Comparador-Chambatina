export interface Platform {
  id: string;
  name: string;
  domain: string;
  color: string;
  bgColor: string;
  logo: string;
}

export const platforms: Platform[] = [
  { id: "facebook", name: "Facebook Cuba", domain: "facebook.com", color: "#1877F2", bgColor: "#1877F214", logo: "👥" },
  { id: "revolico", name: "Revolico", domain: "revolico.com", color: "#E65100", bgColor: "#E6510014", logo: "📱" },
  { id: "bachecubano", name: "BacheCubano", domain: "bachecubano.com", color: "#1565C0", bgColor: "#1565C014", logo: "🏪" },
  { id: "telegram", name: "Telegram", domain: "t.me", color: "#0088CC", bgColor: "#0088CC14", logo: "✈️" },
  { id: "whatsapp", name: "WhatsApp", domain: "wa.me", color: "#25D366", bgColor: "#25D36614", logo: "💬" },
  { id: "timbri", name: "Timbri", domain: "timbri.com", color: "#333333", bgColor: "#33333314", logo: "🏷️" },
  { id: "instagram", name: "Instagram", domain: "instagram.com", color: "#E4405F", bgColor: "#E4405F14", logo: "📸" },
];

export function getPlatformById(id: string): Platform | undefined {
  return platforms.find((p) => p.id === id);
}

// Provincias de Cuba
export const PROVINCIAS = [
  "La Habana", "Pinar del Río", "Artemisa", "Mayabeque", "Matanzas",
  "Cienfuegos", "Villa Clara", "Sancti Spíritus", "Ciego de Ávila",
  "Camagüey", "Las Tunas", "Holguín", "Granma", "Santiago de Cuba",
  "Guantánamo", "Isla de la Juventud",
];

// Búsquedas populares para el mercado cubano
export const trendingSearches = [
  "EcoFlow Delta 2",
  "Divisores de voltaje inversores",
  "Panel solar 550W",
  "Batería litio 48V",
  "AirPods Pro",
  "Teléfono Xiaomi",
  "Router Mikrotik",
  "Cámara de seguridad WiFi",
  "Televisor Samsung 55",
  "Aire acondicionado 12000 BTU",
  "Laptop",
  "Moto eléctrica",
];
