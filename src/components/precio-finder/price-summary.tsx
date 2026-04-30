"use client";

import { motion } from "framer-motion";
import {
  TrendingDown,
  DollarSign,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PriceSummaryProps {
  summary: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalResults: number;
  platformsFound: string[];
  currencySymbol?: string;
}

export function PriceSummary({
  summary,
  minPrice,
  maxPrice,
  avgPrice,
  totalResults,
  platformsFound,
  currencySymbol = "$",
}: PriceSummaryProps) {
  const savings = maxPrice - minPrice;
  const savingsPercent = maxPrice > 0 ? ((savings / maxPrice) * 100).toFixed(0) : "0";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-2 border-amber-200 shadow-amber-100/50 shadow-md">
        <CardContent className="p-5 sm:p-6">
          {/* Summary text */}
          <div className="flex items-start gap-3 mb-5">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm sm:text-base font-medium text-gray-700 leading-relaxed">
              {summary}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
              label="Precio más bajo"
              value={minPrice > 0 ? `${currencySymbol}${minPrice.toFixed(2)}` : "N/A"}
              highlight
            />
            <StatCard
              icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
              label="Precio más alto"
              value={maxPrice > 0 ? `${currencySymbol}${maxPrice.toFixed(2)}` : "N/A"}
            />
            <StatCard
              icon={<TrendingDown className="h-4 w-4 text-amber-500" />}
              label="Ahorro potencial"
              value={savings > 0 ? `${currencySymbol}${savings.toFixed(2)}` : "N/A"}
              highlight
            />
            <StatCard
              icon={<BarChart3 className="h-4 w-4 text-purple-500" />}
              label="Promedio"
              value={avgPrice > 0 ? `${currencySymbol}${avgPrice.toFixed(2)}` : "N/A"}
            />
          </div>

          {/* Platforms found & count */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-gray-500">
              {totalResults} resultado{totalResults !== 1 ? "s" : ""} en{" "}
              {platformsFound.length} plataforma{platformsFound.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 text-center ${
        highlight ? "bg-emerald-50 border border-emerald-100" : "bg-gray-50"
      }`}
    >
      <div className="flex justify-center mb-1">{icon}</div>
      <div
        className={`text-sm sm:text-base font-bold ${
          highlight ? "text-emerald-700" : "text-gray-800"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
