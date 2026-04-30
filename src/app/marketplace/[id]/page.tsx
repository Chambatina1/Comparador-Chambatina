"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Phone,
  MessageCircle,
  Image as ImageIcon,
  Loader2,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, PROXY_URL, CATEGORY_LABELS } from "@/lib/proxy";

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

export default function ListingDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetchListing = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/marketplace/${id}`);
        if (res.ok) {
          const data = await res.json();
          setListing(data.listing || data.data || data);
        } else {
          setError("Anuncio no encontrado");
        }
      } catch {
        setError("Error al cargar el anuncio");
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  const photos = listing?.photos?.filter(Boolean) || [];

  const nextPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Skeleton className="h-10 w-32 mb-4" />
          <Skeleton className="h-72 w-full rounded-2xl mb-4" />
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-10 w-40 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center px-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{error || "Anuncio no encontrado"}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            El anuncio que buscas no existe o fue eliminado.
          </p>
          <Link href="/marketplace">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al marketplace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/marketplace">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-sm font-semibold text-emerald-700 truncate flex-1">
            Detalle del anuncio
          </h1>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-24">
          {/* Photo gallery */}
          {photos.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl overflow-hidden bg-gray-100"
            >
              <div className="relative h-64 sm:h-80">
                <img
                  src={
                    photos[currentPhotoIndex].startsWith("http")
                      ? photos[currentPhotoIndex]
                      : `${PROXY_URL}${photos[currentPhotoIndex]}`
                  }
                  alt={`${listing.title} - foto ${currentPhotoIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Navigation arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              {/* Photo indicators */}
              {photos.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPhotoIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentPhotoIndex
                          ? "bg-white w-5"
                          : "bg-white/50 hover:bg-white/75"
                      }`}
                    />
                  ))}
                </div>
              )}
              {/* Category badge */}
              <Badge className="absolute top-3 left-3 bg-emerald-600/90 text-white text-xs backdrop-blur-sm">
                {CATEGORY_LABELS[listing.category] || listing.category || "General"}
              </Badge>
            </motion.div>
          ) : (
            <div className="h-64 sm:h-80 rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
              <ImageIcon className="h-16 w-16 text-gray-300" />
            </div>
          )}

          {/* Photo thumbnails */}
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPhotoIndex(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    i === currentPhotoIndex
                      ? "border-emerald-500 ring-2 ring-emerald-200"
                      : "border-gray-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={
                      photo.startsWith("http") ? photo : `${PROXY_URL}${photo}`
                    }
                    alt={`Miniatura ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
              {listing.title}
            </h2>
          </motion.div>

          {/* Price */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-emerald-50 rounded-2xl p-4 flex items-center justify-between"
          >
            <div>
              <span className="text-3xl font-bold text-emerald-700">
                {listing.price > 0
                  ? `$${listing.price.toLocaleString("es-CU")}`
                  : "Consultar precio"}
              </span>
              {listing.currency && listing.price > 0 && (
                <span className="ml-2 text-sm text-emerald-600 font-medium">
                  {listing.currency}
                </span>
              )}
            </div>
            {listing.category && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                {CATEGORY_LABELS[listing.category] || listing.category}
              </Badge>
            )}
          </motion.div>

          {/* Details grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            {/* Province */}
            {listing.province && (
              <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin className="h-3 w-3" />
                  Ubicación
                </div>
                <p className="text-sm font-medium text-gray-800">
                  {listing.province}
                  {listing.municipality ? `, ${listing.municipality}` : ""}
                </p>
              </div>
            )}

            {/* Seller */}
            {listing.sellerName && (
              <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <User className="h-3 w-3" />
                  Vendedor
                </div>
                <p className="text-sm font-medium text-gray-800">
                  {listing.sellerName}
                </p>
              </div>
            )}

            {/* Phone */}
            {listing.phone && (
              <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Phone className="h-3 w-3" />
                  Teléfono
                </div>
                <a
                  href={`tel:${listing.phone.replace(/[^0-9+]/g, "")}`}
                  className="text-sm font-medium text-emerald-600 hover:underline"
                >
                  {listing.phone}
                </a>
              </div>
            )}

            {/* Date */}
            {listing.createdAt && (
              <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Publicado
                </div>
                <p className="text-sm font-medium text-gray-800">
                  {new Date(listing.createdAt).toLocaleDateString("es-CU", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </motion.div>

          {/* Description */}
          {listing.description && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Descripción</h3>
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {listing.description}
                </p>
              </div>
            </motion.div>
          )}

          {/* Contact buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-3"
          >
            {listing.phone && (
              <a
                href={`https://wa.me/${listing.phone.replace(/[^0-9+]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-base font-semibold shadow-lg">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  WhatsApp
                </Button>
              </a>
            )}
            {listing.phone && (
              <a href={`tel:${listing.phone.replace(/[^0-9+]/g, "")}`} className="flex-1">
                <Button variant="outline" className="w-full h-12 text-base">
                  <Phone className="h-5 w-5 mr-2" />
                  Llamar
                </Button>
              </a>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
