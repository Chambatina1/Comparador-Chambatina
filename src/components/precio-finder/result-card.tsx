"use client";

import { motion } from "framer-motion";
import {
  ExternalLink,
  Star,
  Tag,
  TrendingDown,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "./platform-badge";

export interface ProductResult {
  id: string;
  name: string;
  price: number;
  priceFormatted: string;
  platform: string;
  platformName: string;
  url: string;
  image: string;
  rating: number;
  isBestPrice: boolean;
}

interface ResultCardProps {
  result: ProductResult;
  index: number;
  currencySymbol?: string;
}

export function ResultCard({ result, index, currencySymbol = "$" }: ResultCardProps) {
  const displayPrice =
    result.price > 0
      ? `${currencySymbol}${result.price.toFixed(2)}`
      : result.priceFormatted;

  // Generate a consistent color for the placeholder based on platform
  const placeholderColors: Record<string, string> = {
    amazon: "from-orange-100 to-orange-50",
    mercadolibre: "from-yellow-100 to-yellow-50",
    aliexpress: "from-red-100 to-red-50",
    temu: "from-orange-100 to-amber-50",
    shein: "from-gray-100 to-gray-50",
    tiktok: "from-pink-100 to-pink-50",
    other: "from-gray-100 to-gray-50",
  };

  const bgGradient = placeholderColors[result.platform] || placeholderColors.other;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
    >
      <Card
        className={`relative overflow-hidden h-full transition-all border-2 ${
          result.isBestPrice
            ? "border-emerald-400 shadow-emerald-100 shadow-lg"
            : "border-gray-100 hover:border-amber-200"
        }`}
      >
        {/* Best price badge */}
        {result.isBestPrice && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-0.5 text-xs font-bold gap-1 shadow-sm">
              <Tag className="h-3 w-3" />
              Mejor Precio
            </Badge>
          </div>
        )}

        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Product Image Placeholder */}
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gradient-to-br ${bgGradient} flex-shrink-0 flex items-center justify-center overflow-hidden`}
            >
              {result.image ? (
                <img
                  src={result.image}
                  alt={result.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="text-3xl opacity-60">
                  {result.platform === "amazon"
                    ? "📦"
                    : result.platform === "mercadolibre"
                      ? "🏪"
                      : result.platform === "aliexpress"
                        ? "🛍️"
                        : result.platform === "temu"
                          ? "🛒"
                          : result.platform === "shein"
                            ? "👗"
                            : result.platform === "tiktok"
                              ? "🎵"
                              : "🛒"}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 text-gray-800">
                  {result.name}
                </h3>
              </div>

              {/* Platform Badge */}
              <div className="mt-1.5">
                <PlatformBadge platformId={result.platform} size="sm" />
              </div>

              {/* Rating */}
              {result.rating > 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= result.rating
                            ? "text-amber-400 fill-amber-400"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {result.rating.toFixed(1)}
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center justify-between mt-2">
                <span
                  className={`text-lg sm:text-xl font-bold ${
                    result.isBestPrice ? "text-emerald-600" : "text-gray-900"
                  }`}
                >
                  {displayPrice}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs rounded-lg hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors"
                  onClick={() => window.open(result.url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver
                </Button>
              </div>
            </div>
          </div>

          {/* Savings indicator */}
          {result.isBestPrice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-1.5"
            >
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="font-medium">El precio más bajo encontrado</span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* Skeleton for loading state */
export function ResultCardSkeleton() {
  return (
    <Card className="overflow-hidden border-2 border-gray-100">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
            <div className="h-5 bg-gray-100 rounded animate-pulse w-1/3 mt-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
