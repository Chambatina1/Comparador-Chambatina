"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ArrowLeft, Loader2, ExternalLink, Phone, MapPin, Calendar, Users, Tag, Crown, Filter, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { PROVINCIAS, trendingSearches } from "@/lib/platforms";

interface CubaProduct {
  id: string;
  name: string;
  price: number;
  priceFormatted: string;
  currency: string;
  url: string;
  phone: string;
  province: string;
  municipality: string;
  group: string;
  publishDate: string;
  isBestPrice: boolean;
  notes: string;
}

interface SearchResult {
  query: string;
  results: CubaProduct[];
  totalResults: number;
  stats: {
    provinces: string[];
    withPhone: number;
    withDate: number;
    pricedCount: number;
    minPrice: number;
  };
}

export default function Home() {
  const [viewMode, setViewMode] = useState<"home" | "results">("home");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterProvince, setFilterProvince] = useState("all");
  const [searchInput, setSearchInput] = useState("");

  const performSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setViewMode("results");
    setSearchInput(query);
    setFilterProvince("all");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Error en la búsqueda");
      }

      const data = await response.json();
      setSearchResult(data);
    } catch (error) {
      console.error("Search error:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Intenta de nuevo", variant: "destructive" });
      setViewMode("home");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const goHome = useCallback(() => {
    setViewMode("home");
    setSearchResult(null);
    setFilterProvince("all");
  }, []);

  // Filter by province
  const filteredResults = searchResult?.results?.filter((r) =>
    filterProvince === "all" || r.province === filterProvince
  ) || [];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
              <Search className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-emerald-700 leading-tight">CubaFinder</h1>
              <p className="text-[9px] text-muted-foreground -mt-0.5 hidden sm:block">Buscador de ventas Cuba</p>
            </div>
          </button>
          {viewMode === "results" && (
            <Button variant="ghost" size="sm" onClick={goHome} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Nueva búsqueda
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {viewMode === "home" ? (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Hero */}
              <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-blue-600" />
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                  <div className="absolute bottom-10 right-10 w-60 h-60 bg-yellow-300 rounded-full blur-3xl" />
                </div>
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center text-white">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                      <Crown className="h-3 w-3 mr-1" />
                      Busca en grupos de ventas de toda Cuba
                    </Badge>
                    <h2 className="text-3xl sm:text-5xl font-extrabold mb-4">
                      Encuentra el <span className="text-yellow-300">mejor precio</span> en Cuba
                    </h2>
                    <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto mb-8">
                      Buscamos en grupos de Facebook como Ventas La Habana, Ventas Pinar, Ventas Holguín y todos los municipios. Encontramos precio, teléfono y ubicación.
                    </p>
                  </motion.div>

                  {/* Search */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-2xl mx-auto">
                    <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); const q = formData.get("q") as string; if (q?.trim()) performSearch(q.trim()); }}>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            name="q"
                            type="text"
                            placeholder="¿Qué buscas? Ej: EcoFlow Delta 2, panel solar..."
                            className="w-full h-12 pl-11 pr-4 rounded-xl border-0 bg-white text-gray-900 text-base shadow-lg focus:ring-2 focus:ring-yellow-300 placeholder:text-gray-400"
                            autoComplete="off"
                          />
                        </div>
                        <Button type="submit" disabled={isLoading} className="h-12 px-6 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-xl shadow-lg">
                          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 mr-2" />}
                          Buscar
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              </section>

              {/* Trending */}
              <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
                <h3 className="text-center text-sm font-semibold text-gray-500 mb-4 flex items-center justify-center gap-2">
                  <Tag className="h-4 w-4" /> Búsquedas populares
                </h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {trendingSearches.map((term, i) => (
                    <motion.button
                      key={term}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => performSearch(term)}
                      className="px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-sm text-gray-700 hover:text-emerald-700 transition-all shadow-sm"
                    >
                      {term}
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* Provincias */}
              <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <h3 className="text-center text-sm font-semibold text-gray-500 mb-4 flex items-center justify-center gap-2">
                  <MapPin className="h-4 w-4" /> Buscamos en todas las provincias
                </h3>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {PROVINCIAS.map((prov) => (
                    <span key={prov} className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs border border-emerald-100">{prov}</span>
                  ))}
                </div>
              </section>

              {/* Info */}
              <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: <Users className="h-6 w-6" />, title: "Grupos de Ventas", desc: "Ventas La Habana, Ventas Pinar, Ventas Holguín..." },
                    { icon: <Phone className="h-6 w-6" />, title: "Teléfono del Vendedor", desc: "Encontramos el contacto directo para que llames o escribas" },
                    { icon: <MapPin className="h-6 w-6" />, title: "Todas las Provincias", desc: "Desde Pinar del Río hasta Guantánamo, todos los municipios" },
                  ].map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                      className="text-center p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 mb-2">{item.icon}</div>
                      <h4 className="font-semibold text-gray-800 text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          ) : (
            /* ===== RESULTS VIEW ===== */
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
              {/* Search bar in results */}
              <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); const q = formData.get("q") as string; if (q?.trim()) performSearch(q.trim()); }}
                className="mb-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input name="q" defaultValue={searchInput} type="text"
                      placeholder="Buscar otro producto..."
                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300" />
                  </div>
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              {/* Stats bar */}
              {searchResult && !isLoading && (
                <div className="mb-6 space-y-3">
                  {/* Summary */}
                  <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Search className="h-4 w-4 text-emerald-600" />
                        <span className="font-medium text-gray-700">&quot;{searchResult.query}&quot;</span>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{searchResult.totalResults} resultado(s)</Badge>
                      {searchResult.stats.provinces.length > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{searchResult.stats.provinces.length} provincia(s)</span>
                        </div>
                      )}
                      {searchResult.stats.withPhone > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{searchResult.stats.withPhone} con teléfono</span>
                        </div>
                      )}
                      {searchResult.stats.minPrice > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          Desde ${searchResult.stats.minPrice.toLocaleString("es-CU")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Province filter */}
                  {searchResult.stats.provinces.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Select value={filterProvince} onValueChange={setFilterProvince}>
                        <SelectTrigger className="w-[200px] h-8 text-xs rounded-lg">
                          <SelectValue placeholder="Todas las provincias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las provincias ({searchResult.totalResults})</SelectItem>
                          {searchResult.stats.provinces.map((prov) => {
                            const count = searchResult.results.filter((r) => r.province === prov).length;
                            return <SelectItem key={prov} value={prov}>{prov} ({count})</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">Buscando en grupos de ventas de Cuba...</span>
                  </div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results Table */}
              {!isLoading && filteredResults.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-emerald-50 border-b border-emerald-100">
                          <th className="text-left px-4 py-3 font-semibold text-emerald-800 text-xs uppercase tracking-wide">Producto</th>
                          <th className="text-left px-4 py-3 font-semibold text-emerald-800 text-xs uppercase tracking-wide">Precio</th>
                          <th className="text-left px-4 py-3 font-semibold text-emerald-800 text-xs uppercase tracking-wide hidden md:table-cell">Provincia</th>
                          <th className="text-left px-4 py-3 font-semibold text-emerald-800 text-xs uppercase tracking-wide hidden lg:table-cell">Municipio</th>
                          <th className="text-left px-4 py-3 font-semibold text-emerald-800 text-xs uppercase tracking-wide hidden sm:table-cell">Teléfono</th>
                          <th className="text-left px-4 py-3 font-semibold text-emerald-800 text-xs uppercase tracking-wide hidden xl:table-cell">Fecha</th>
                          <th className="text-left px-4 py-3 font-semibold text-emerald-800 text-xs uppercase tracking-wide hidden lg:table-cell">Grupo</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredResults.map((result, index) => (
                          <motion.tr
                            key={result.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.03 }}
                            className={`hover:bg-emerald-50/50 transition-colors ${result.isBestPrice ? "bg-yellow-50/70" : ""}`}
                          >
                            {/* Product */}
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2">
                                {result.isBestPrice && (
                                  <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 flex-shrink-0 mt-0.5">
                                    <Crown className="h-2.5 w-2.5" />
                                  </Badge>
                                )}
                                <div className="max-w-xs">
                                  <p className="font-medium text-gray-800 line-clamp-2 text-xs leading-relaxed">{result.name}</p>
                                  {result.notes && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{result.notes}</p>}
                                </div>
                              </div>
                            </td>
                            {/* Price */}
                            <td className="px-4 py-3">
                              <span className={`font-bold text-sm ${result.isBestPrice ? "text-emerald-600" : result.price > 0 ? "text-gray-900" : "text-gray-400"}`}>
                                {result.priceFormatted}
                              </span>
                              {result.currency && result.price > 0 && (
                                <span className="text-[10px] text-muted-foreground ml-1">{result.currency}</span>
                              )}
                            </td>
                            {/* Province */}
                            <td className="px-4 py-3 hidden md:table-cell">
                              {result.province ? (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                                  <MapPin className="h-3 w-3 text-emerald-500" />
                                  {result.province}
                                </span>
                              ) : <span className="text-xs text-gray-300">—</span>}
                            </td>
                            {/* Municipality */}
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <span className="text-xs text-gray-500">{result.municipality || "—"}</span>
                            </td>
                            {/* Phone */}
                            <td className="px-4 py-3 hidden sm:table-cell">
                              {result.phone ? (
                                <a
                                  href={`https://wa.me/${result.phone.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 hover:underline"
                                >
                                  <Phone className="h-3 w-3" />
                                  {result.phone}
                                </a>
                              ) : <span className="text-xs text-gray-300">—</span>}
                            </td>
                            {/* Date */}
                            <td className="px-4 py-3 hidden xl:table-cell">
                              {result.publishDate ? (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                  <Calendar className="h-3 w-3" />
                                  {result.publishDate}
                                </span>
                              ) : <span className="text-xs text-gray-300">—</span>}
                            </td>
                            {/* Group */}
                            <td className="px-4 py-3 hidden lg:table-cell">
                              {result.group ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-600 bg-blue-50">
                                  <Users className="h-2.5 w-2.5 mr-0.5" />
                                  {result.group.length > 25 ? result.group.substring(0, 25) + "..." : result.group}
                                </Badge>
                              ) : <span className="text-xs text-gray-300">—</span>}
                            </td>
                            {/* Link */}
                            <td className="px-4 py-3">
                              <a href={result.url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 hover:bg-emerald-100 text-gray-500 hover:text-emerald-600 transition-colors">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile card view */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {filteredResults.map((result, index) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className={`p-4 ${result.isBestPrice ? "bg-yellow-50/70" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-medium text-gray-800 text-sm line-clamp-2 flex-1">{result.name}</p>
                          {result.isBestPrice && (
                            <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 flex-shrink-0">
                              <Crown className="h-2.5 w-2.5" />
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-bold ${result.isBestPrice ? "text-emerald-600" : "text-gray-900"}`}>{result.priceFormatted}</span>
                          {result.phone && (
                            <a href={`https://wa.me/${result.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                              <Phone className="h-3 w-3" /> {result.phone}
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                          {result.province && (
                            <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{result.province}</span>
                          )}
                          {result.municipality && <span>{result.municipality}</span>}
                          {result.publishDate && (
                            <span className="inline-flex items-center gap-0.5"><Calendar className="h-3 w-3" />{result.publishDate}</span>
                          )}
                          {result.group && <Badge variant="outline" className="text-[9px] px-1 py-0">{result.group.length > 20 ? result.group.substring(0, 20) + "..." : result.group}</Badge>}
                        </div>
                        <div className="mt-2">
                          <a href={result.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <ExternalLink className="h-3 w-3" /> Ver publicación
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {!isLoading && searchResult && searchResult.totalResults === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No encontramos &quot;{searchResult.query}&quot;</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Intenta con otro término o verifica la ortografía.
                  </p>
                  <Button onClick={goHome} className="bg-emerald-600 hover:bg-emerald-700">
                    <Search className="h-4 w-4 mr-2" /> Nueva búsqueda
                  </Button>
                </div>
              )}

              {/* Filtered empty */}
              {!isLoading && searchResult && filteredResults.length === 0 && searchResult.totalResults > 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-3">No hay resultados para esta provincia.</p>
                  <Button variant="outline" size="sm" onClick={() => setFilterProvince("all")}>
                    <Filter className="h-3.5 w-3.5 mr-1" /> Ver todas las provincias
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                <Search className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-emerald-700">CubaFinder</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Busca en grupos de Facebook de toda Cuba &middot; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
