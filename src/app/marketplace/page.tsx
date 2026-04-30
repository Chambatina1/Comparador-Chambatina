"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingBag,
  PlusCircle,
  MapPin,
  Phone,
  MessageCircle,
  Image as ImageIcon,
  Loader2,
  Package,
  X,
  ChevronRight,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, PROXY_URL, CATEGORY_LABELS, ALL_CATEGORIES } from "@/lib/proxy";
import { PROVINCIAS } from "@/lib/platforms";

interface Listing {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  phone: string;
  province: string;
  municipality?: string;
  category: string;
  sellerName?: string;
  photos?: string[];
  createdAt?: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<string[]>(ALL_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [filterProvince, setFilterProvince] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/categories");
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCategories(data.map((c: any) => c.id || c));
          }
        }
      } catch {
        // Use default categories
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch listings when filters change
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (activeCategory !== "all") params.set("category", activeCategory);
    if (filterProvince !== "all") params.set("province", filterProvince);
    if (searchQuery) params.set("search", searchQuery);

    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/marketplace?${params.toString()}`);
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            setListings(Array.isArray(data) ? data : data.listings || data.data || []);
          } else {
            console.error("Failed to fetch listings:", res.status);
            setListings([]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching listings:", err);
          setListings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeCategory, filterProvince, searchQuery]);

  const openListing = (listing: Listing) => {
    setSelectedListing(listing);
    setDialogOpen(true);
  };

  const goToDetail = (id: string) => {
    setDialogOpen(false);
    router.push(`/marketplace/${id}`);
  };

  const filteredListings = listings; // Filtering is done server-side via params

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/marketplace" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
              <ShoppingBag className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-emerald-700 leading-tight">Marketplace</h1>
              <p className="text-[9px] text-muted-foreground -mt-0.5 hidden sm:block">
                Anuncios clasificados Cuba
              </p>
            </div>
          </Link>
          <Link href="/publish">
            <Button className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white text-xs sm:text-sm shadow-md">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Publicar anuncio</span>
              <span className="sm:hidden">Publicar</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Search and filters */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar en el marketplace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-gray-200 bg-white shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Province filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select value={filterProvince} onValueChange={setFilterProvince}>
              <SelectTrigger className="w-[200px] h-8 text-xs rounded-lg">
                <SelectValue placeholder="Todas las provincias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las provincias</SelectItem>
                {PROVINCIAS.map((prov) => (
                  <SelectItem key={prov} value={prov}>
                    {prov}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory("all")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === "all"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                  activeCategory === cat
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>

          {/* Stats bar */}
          {!loading && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                <Package className="h-3 w-3 mr-1" />
                {filteredListings.length} anuncio(s)
              </Badge>
              {activeCategory !== "all" && (
                <span className="text-xs">
                  Categoría: {CATEGORY_LABELS[activeCategory] || activeCategory}
                </span>
              )}
              {filterProvince !== "all" && (
                <span className="text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {filterProvince}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Listings grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm"
                >
                  <Skeleton className="h-48 w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No hay anuncios disponibles
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Sé el primero en publicar un anuncio en esta categoría.
              </p>
              <Link href="/publish">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Publicar anuncio
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredListings.map((listing, index) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => openListing(listing)}
                  >
                    {/* Photo */}
                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                      {listing.photos && listing.photos.length > 0 ? (
                        <img
                          src={
                            listing.photos[0].startsWith("http")
                              ? listing.photos[0]
                              : `${PROXY_URL}${listing.photos[0]}`
                          }
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
                          <ImageIcon className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                      {/* Category badge */}
                      {listing.category && (
                        <Badge className="absolute top-2 left-2 bg-emerald-600/90 text-white text-[10px] backdrop-blur-sm">
                          {CATEGORY_LABELS[listing.category] || listing.category}
                        </Badge>
                      )}
                      {/* Price */}
                      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-lg">
                        <span className="font-bold text-sm">
                          {listing.price > 0
                            ? `$${listing.price.toLocaleString("es-CU")}`
                            : "Consultar"}
                        </span>
                        {listing.currency && listing.price > 0 && (
                          <span className="text-[10px] ml-1 opacity-80">
                            {listing.currency}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 mb-2 leading-snug">
                        {listing.title}
                      </h3>
                      <div className="space-y-1.5">
                        {listing.province && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <MapPin className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                            <span className="truncate">
                              {listing.province}
                              {listing.municipality ? `, ${listing.municipality}` : ""}
                            </span>
                          </div>
                        )}
                        {listing.sellerName && (
                          <p className="text-xs text-gray-400 truncate">
                            Por: {listing.sellerName}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                        {listing.phone ? (
                          <a
                            href={`https://wa.me/${listing.phone.replace(/[^0-9+]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 hover:underline"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300">Sin contacto</span>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          {selectedListing && (
            <>
              {/* Photo */}
              <div className="relative h-56 sm:h-64 bg-gray-100">
                {selectedListing.photos && selectedListing.photos.length > 0 ? (
                  <img
                    src={
                      selectedListing.photos[0].startsWith("http")
                        ? selectedListing.photos[0]
                        : `${PROXY_URL}${selectedListing.photos[0]}`
                    }
                    alt={selectedListing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
                    <ImageIcon className="h-16 w-16 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-black/70 text-white backdrop-blur-sm">
                    {selectedListing.category
                      ? CATEGORY_LABELS[selectedListing.category] || selectedListing.category
                      : "General"}
                  </Badge>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-lg leading-snug">
                    {selectedListing.title}
                  </DialogTitle>
                </DialogHeader>

                {/* Price */}
                <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-2xl font-bold text-emerald-700">
                    {selectedListing.price > 0
                      ? `$${selectedListing.price.toLocaleString("es-CU")}`
                      : "Consultar precio"}
                  </span>
                  {selectedListing.currency && selectedListing.price > 0 && (
                    <Badge variant="secondary">{selectedListing.currency}</Badge>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>
                    {selectedListing.province}
                    {selectedListing.municipality
                      ? `, ${selectedListing.municipality}`
                      : ""}
                  </span>
                </div>

                {/* Seller */}
                {selectedListing.sellerName && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Vendedor: </span>
                    <span className="font-medium text-gray-700">
                      {selectedListing.sellerName}
                    </span>
                  </div>
                )}

                {/* Description */}
                {selectedListing.description && (
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
                    <p className="whitespace-pre-wrap">{selectedListing.description}</p>
                  </div>
                )}

                {/* Date */}
                {selectedListing.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    Publicado:{" "}
                    {new Date(selectedListing.createdAt).toLocaleDateString("es-CU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedListing.phone && (
                    <a
                      href={`https://wa.me/${selectedListing.phone.replace(/[^0-9+]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                    </a>
                  )}
                  {selectedListing.phone && (
                    <a href={`tel:${selectedListing.phone.replace(/[^0-9+]/g, "")}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Phone className="h-4 w-4 mr-2" />
                        Llamar
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => goToDetail(selectedListing.id)}
                  >
                    Ver detalle
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
