"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Building2,
  PlusCircle,
  MapPin,
  Phone,
  MessageCircle,
  Instagram,
  Send,
  Globe,
  Loader2,
  Filter,
  ExternalLink,
  Clock,
  Mail,
  Facebook,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
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
import { proxyFetch, PROXY_URL, CATEGORY_LABELS, ALL_CATEGORIES } from "@/lib/proxy";
import { PROVINCIAS } from "@/lib/platforms";

interface Mipyme {
  id: string;
  name: string;
  description?: string;
  category: string;
  province: string;
  municipality?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  telegram?: string;
  services?: string;
  schedule?: string;
  logo?: string;
  createdAt?: string;
}

export default function MipymesPage() {
  const [mipymes, setMipymes] = useState<Mipyme[]>([]);
  const [categories, setCategories] = useState<string[]>(ALL_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterProvince, setFilterProvince] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch categories on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await proxyFetch("/categories");
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCategories(data);
          }
        }
      } catch {
        // Use default categories
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch mipymes when filters change
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (filterCategory !== "all") params.set("category", filterCategory);
    if (filterProvince !== "all") params.set("province", filterProvince);
    if (searchQuery) params.set("search", searchQuery);

    (async () => {
      setLoading(true);
      try {
        const res = await proxyFetch(`/mipymes?${params.toString()}`);
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            setMipymes(Array.isArray(data) ? data : data.mipymes || data.data || []);
          } else {
            console.error("Failed to fetch mipymes:", res.status);
            setMipymes([]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching mipymes:", err);
          setMipymes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filterCategory, filterProvince, searchQuery]);

  const getSocialLink = (platform: string, handle: string) => {
    switch (platform) {
      case "instagram":
        return `https://instagram.com/${handle.replace("@", "")}`;
      case "telegram":
        return `https://t.me/${handle.replace("@", "")}`;
      case "facebook":
        return `https://facebook.com/${handle}`;
      default:
        return "#";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/mipymes" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-emerald-700 leading-tight">Mipymes</h1>
              <p className="text-[9px] text-muted-foreground -mt-0.5 hidden sm:block">
                Directorio de negocios Cuba
              </p>
            </div>
          </Link>
          <Link href="/register-mipyme">
            <Button className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white text-xs sm:text-sm shadow-md">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Registrar mi negocio</span>
              <span className="sm:hidden">Registrar</span>
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
              placeholder="Buscar mipymes por nombre, servicio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-gray-200 bg-white shadow-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat] || cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterProvince} onValueChange={setFilterProvince}>
              <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg">
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

          {/* Stats */}
          {!loading && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                <Building2 className="h-3 w-3 mr-1" />
                {mipymes.length} negocio(s)
              </Badge>
            </div>
          )}
        </div>

        {/* Mipymes grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : mipymes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No hay negocios registrados
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Sé el primero en registrar tu negocio en nuestro directorio.
              </p>
              <Link href="/register-mipyme">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Registrar mi negocio
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {mipymes.map((mipyme, index) => (
                  <motion.div
                    key={mipyme.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group"
                  >
                    {/* Top accent bar */}
                    <div className="h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />

                    <div className="p-5">
                      {/* Logo & Name */}
                      <div className="flex items-start gap-3 mb-3">
                        {mipyme.logo ? (
                          <img
                            src={
                              mipyme.logo.startsWith("http")
                                ? mipyme.logo
                                : `${PROXY_URL}${mipyme.logo}`
                            }
                            alt={mipyme.name}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-6 w-6 text-emerald-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors">
                            {mipyme.name}
                          </h3>
                          {mipyme.category && (
                            <Badge variant="secondary" className="text-[10px] mt-1">
                              {CATEGORY_LABELS[mipyme.category] || mipyme.category}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {mipyme.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                          {mipyme.description}
                        </p>
                      )}

                      {/* Location */}
                      {mipyme.province && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                          <MapPin className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                          <span className="truncate">
                            {mipyme.province}
                            {mipyme.municipality ? `, ${mipyme.municipality}` : ""}
                            {mipyme.address ? ` — ${mipyme.address}` : ""}
                          </span>
                        </div>
                      )}

                      {/* Services */}
                      {mipyme.services && (
                        <div className="text-xs text-gray-500 mb-3">
                          <span className="font-medium text-gray-700">Servicios: </span>
                          <span className="line-clamp-2">{mipyme.services}</span>
                        </div>
                      )}

                      {/* Schedule */}
                      {mipyme.schedule && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                          <Clock className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                          <span className="line-clamp-1">{mipyme.schedule}</span>
                        </div>
                      )}

                      {/* Social links */}
                      <div className="flex items-center gap-1.5 pt-3 border-t border-gray-50">
                        {mipyme.whatsapp && (
                          <a
                            href={`https://wa.me/${mipyme.whatsapp.replace(/[^0-9+]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
                        {mipyme.phone && !mipyme.whatsapp && (
                          <a
                            href={`tel:${mipyme.phone.replace(/[^0-9+]/g, "")}`}
                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                            title="Teléfono"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        {mipyme.instagram && (
                          <a
                            href={getSocialLink("instagram", mipyme.instagram)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 flex items-center justify-center transition-colors"
                            title="Instagram"
                          >
                            <Instagram className="h-4 w-4" />
                          </a>
                        )}
                        {mipyme.facebook && (
                          <a
                            href={getSocialLink("facebook", mipyme.facebook)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                            title="Facebook"
                          >
                            <Facebook className="h-4 w-4" />
                          </a>
                        )}
                        {mipyme.telegram && (
                          <a
                            href={getSocialLink("telegram", mipyme.telegram)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 flex items-center justify-center transition-colors"
                            title="Telegram"
                          >
                            <Send className="h-4 w-4" />
                          </a>
                        )}
                        {mipyme.email && (
                          <a
                            href={`mailto:${mipyme.email}`}
                            className="w-8 h-8 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
                            title="Email"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
