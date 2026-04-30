"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Camera,
  Link2,
  ArrowLeft,
  SlidersHorizontal,
  ArrowUpDown,
  TrendingUp,
  ShieldCheck,
  Zap,
  Globe,
  RefreshCw,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { SearchBar } from "@/components/precio-finder/search-bar";
import {
  ResultCard,
  ResultCardSkeleton,
  type ProductResult,
} from "@/components/precio-finder/result-card";
import { PlatformBadge } from "@/components/precio-finder/platform-badge";
import { PriceSummary } from "@/components/precio-finder/price-summary";
import { platforms, trendingSearches } from "@/lib/platforms";

type SortOption = "price-asc" | "price-desc" | "platform" | "relevance";
type ViewMode = "home" | "results";

interface SearchResult {
  query: string;
  results: ProductResult[];
  summary: string;
  totalResults: number;
}

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("price-asc");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Perform search
  const performSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setViewMode("results");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error en la búsqueda");
      }

      const data = await response.json();
      setSearchResult(data);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Error en la búsqueda",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron obtener los resultados. Intenta de nuevo.",
        variant: "destructive",
      });
      setViewMode("home");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback(
    async (file: File) => {
      // Show preview
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      setIsLoading(true);
      setViewMode("results");

      try {
        // Step 1: Analyze the image
        const analyzeForm = new FormData();
        analyzeForm.append("image", file);

        const analyzeResponse = await fetch("/api/analyze-image", {
          method: "POST",
          body: analyzeForm,
        });

        if (!analyzeResponse.ok) {
          throw new Error("No se pudo analizar la imagen");
        }

        const analyzeData = await analyzeResponse.json();
        const productName = analyzeData.productName;

        if (!productName) {
          throw new Error("No se pudo identificar el producto");
        }

        toast({
          title: "Producto identificado",
          description: `Buscando precios para: ${productName}`,
        });

        // Step 2: Search with the identified product name
        const searchResponse = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: productName }),
        });

        if (!searchResponse.ok) {
          throw new Error("Error al buscar precios");
        }

        const searchData = await searchResponse.json();
        setSearchResult(searchData);
      } catch (error) {
        console.error("Image search error:", error);
        toast({
          title: "Error al procesar imagen",
          description:
            error instanceof Error
              ? error.message
              : "Intenta de nuevo o escribe el nombre del producto.",
          variant: "destructive",
        });
        setViewMode("home");
      } finally {
        setIsLoading(false);
        if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
      }
    },
    [imagePreview]
  );

  // Go back home
  const goHome = useCallback(() => {
    setViewMode("home");
    setSearchResult(null);
    setFilterPlatform("all");
    setSortBy("price-asc");
  }, []);

  // Filter and sort results
  const processedResults = useMemo(() => {
    if (!searchResult?.results) return [];

    let filtered = [...searchResult.results];

    // Filter by platform
    if (filterPlatform !== "all") {
      filtered = filtered.filter((r) => r.platform === filterPlatform);
    }

    // Sort
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => {
          if (a.price === 0 && b.price === 0) return 0;
          if (a.price === 0) return 1;
          if (b.price === 0) return -1;
          return a.price - b.price;
        });
        break;
      case "price-desc":
        filtered.sort((a, b) => {
          if (a.price === 0 && b.price === 0) return 0;
          if (a.price === 0) return 1;
          if (b.price === 0) return -1;
          return b.price - a.price;
        });
        break;
      case "platform":
        filtered.sort((a, b) => a.platformName.localeCompare(b.platformName));
        break;
      case "relevance":
      default:
        break;
    }

    return filtered;
  }, [searchResult, filterPlatform, sortBy]);

  // Compute stats for summary
  const summaryStats = useMemo(() => {
    if (!searchResult?.results) {
      return { minPrice: 0, maxPrice: 0, avgPrice: 0, platformsFound: [] };
    }
    const priced = searchResult.results.filter((r) => r.price > 0);
    const minPrice = priced.length > 0 ? Math.min(...priced.map((r) => r.price)) : 0;
    const maxPrice = priced.length > 0 ? Math.max(...priced.map((r) => r.price)) : 0;
    const avgPrice =
      priced.length > 0
        ? priced.reduce((sum, r) => sum + r.price, 0) / priced.length
        : 0;
    const platformSet = new Set(searchResult.results.map((r) => r.platform));
    return {
      minPrice,
      maxPrice,
      avgPrice,
      platformsFound: Array.from(platformSet),
    };
  }, [searchResult]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={goHome}
            className="flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-all">
              <Search className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent leading-tight">
                PrecioFinder
              </h1>
              <p className="text-[10px] text-muted-foreground leading-tight -mt-0.5 hidden sm:block">
                Compara y ahorra
              </p>
            </div>
          </button>

          {viewMode === "results" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goHome}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Nueva búsqueda
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {viewMode === "home" ? (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hero Section */}
              <section className="relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50/50 to-white" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-full translate-y-1/2 -translate-x-1/3" />

                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 lg:py-28">
                  {/* Hero text */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-8 sm:mb-10"
                  >
                    <Badge
                      variant="secondary"
                      className="mb-4 px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 border-amber-200"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Compara precios en segundos
                    </Badge>

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
                      Encuentra el{" "}
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                        mejor precio
                      </span>
                    </h2>

                    <p className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
                      Busca cualquier producto y compara precios entre TikTok Shop, Amazon,
                      AliExpress, SHEIN, Temu y MercadoLibre.
                    </p>
                  </motion.div>

                  {/* Search Bar */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <SearchBar
                      onSearch={performSearch}
                      onImageUpload={handleImageUpload}
                      isLoading={isLoading}
                    />
                  </motion.div>

                  {/* Quick search methods */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex flex-wrap justify-center gap-3 mt-6"
                  >
                    <QuickAction icon={<Search className="h-3.5 w-3.5" />} label="Buscar por nombre" />
                    <QuickAction icon={<Camera className="h-3.5 w-3.5" />} label="Subir foto" />
                    <QuickAction icon={<Link2 className="h-3.5 w-3.5" />} label="Pegar enlace" />
                  </motion.div>
                </div>
              </section>

              {/* Trending Searches */}
              <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                <div className="text-center mb-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center justify-center gap-2">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                    Búsquedas populares
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Descubre los productos más buscados
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  {trendingSearches.map((term, index) => (
                    <motion.button
                      key={term}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.04 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => performSearch(term)}
                      className="px-4 py-2 rounded-full bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 text-sm text-gray-700 hover:text-amber-700 transition-all shadow-sm hover:shadow-md"
                    >
                      {term}
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* How it works */}
              <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 bg-gradient-to-b from-white to-amber-50/30">
                <div className="text-center mb-8">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                    ¿Cómo funciona?
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                  {[
                    {
                      step: "1",
                      icon: <Search className="h-6 w-6" />,
                      title: "Busca tu producto",
                      desc: "Escribe el nombre, pega un enlace o sube una foto del producto.",
                    },
                    {
                      step: "2",
                      icon: <Globe className="h-6 w-6" />,
                      title: "Comparamos precios",
                      desc: "Buscamos en 6 plataformas al mismo tiempo para encontrar el mejor precio.",
                    },
                    {
                      step: "3",
                      icon: <ShieldCheck className="h-6 w-6" />,
                      title: "Ahorra comprando",
                      desc: "Elige la mejor opción y compra directo en la tienda de tu preferencia.",
                    },
                  ].map((item, index) => (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                      className="text-center"
                    >
                      <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white mb-3 shadow-md shadow-amber-500/20">
                        {item.icon}
                        <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white text-amber-600 text-xs font-bold shadow-sm flex items-center justify-center border border-amber-100">
                          {item.step}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-800 mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Platforms */}
              <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                <div className="text-center mb-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                    Comparamos en
                  </h3>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {platforms.map((p, index) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 + 0.5 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <PlatformBadge platformId={p.id} size="md" />
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          ) : (
            /* Results View */
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8"
            >
              {/* Search query & quick re-search */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <SearchBar
                    onSearch={performSearch}
                    onImageUpload={handleImageUpload}
                    isLoading={isLoading}
                  />
                </div>
                {searchResult && !isLoading && (
                  <p className="text-sm text-muted-foreground">
                    Mostrando resultados para:{" "}
                    <span className="font-medium text-gray-700">
                      &ldquo;{searchResult.query}&rdquo;
                    </span>
                  </p>
                )}
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-amber-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">
                      Buscando en múltiples plataformas...
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <ResultCardSkeleton key={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {!isLoading && searchResult && searchResult.results.length > 0 && (
                <div className="space-y-6">
                  {/* Price Summary */}
                  <PriceSummary
                    summary={searchResult.summary}
                    minPrice={summaryStats.minPrice}
                    maxPrice={summaryStats.maxPrice}
                    avgPrice={summaryStats.avgPrice}
                    totalResults={searchResult.totalResults}
                    platformsFound={summaryStats.platformsFound}
                  />

                  {/* Filters & Sort */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>Filtros:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={filterPlatform}
                        onValueChange={setFilterPlatform}
                      >
                        <SelectTrigger className="w-[160px] h-9 text-xs rounded-lg">
                          <SelectValue placeholder="Todas las tiendas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las tiendas</SelectItem>
                          {platforms.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.logo} {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                        <SelectTrigger className="w-[160px] h-9 text-xs rounded-lg">
                          <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                          <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
                          <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
                          <SelectItem value="platform">Por plataforma</SelectItem>
                          <SelectItem value="relevance">Relevancia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Results Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {processedResults.map((result, index) => (
                      <ResultCard key={result.id} result={result} index={index} />
                    ))}
                  </div>

                  {/* Show filtered empty state */}
                  {processedResults.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        No hay resultados para los filtros seleccionados.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilterPlatform("all")}
                        className="mt-3"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Limpiar filtros
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* No Results */}
              {!isLoading && searchResult && searchResult.results.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    No encontramos resultados
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Intenta con un término de búsqueda más general o verifica la ortografía.
                  </p>
                  <Button
                    onClick={goHome}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Intentar otra búsqueda
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50/50 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Search className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                PrecioFinder
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {platforms.map((p) => (
                <span
                  key={p.id}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: p.bgColor,
                    color: p.color,
                  }}
                >
                  {p.logo} {p.name}
                </span>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} PrecioFinder. Compara y ahorra.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function QuickAction({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="flex items-center justify-center w-5 h-5 rounded-md bg-gray-100 text-gray-500">
        {icon}
      </span>
      {label}
    </div>
  );
}
