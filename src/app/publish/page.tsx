"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Camera,
  Check,
  DollarSign,
  Tag,
  MapPin,
  User,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Using native HTML select to avoid Radix UI hydration issues
import { CATEGORY_LABELS, ALL_CATEGORIES } from "@/lib/proxy";
import { PROVINCIAS } from "@/lib/platforms";

export default function PublishPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [categories, setCategories] = useState<string[]>(ALL_CATEGORIES);
  const [dragOver, setDragOver] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [category, setCategory] = useState("");
  const [sellerName, setSellerName] = useState("");

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => { if (res.ok) return res.json(); })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const cats = data.map((c: any) => (typeof c === "string" ? c : c.id)).filter(Boolean);
          if (cats.length > 0) setCategories(cats);
        }
      })
      .catch(() => {});
  }, []);

  const handlePhotoFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const newPhotos = [...photos, ...fileArray].slice(0, 5);
    setPhotos(newPhotos);
    setPhotoPreviews(newPhotos.map((p) => URL.createObjectURL(p)));
  }, [photos]);

  const removePhoto = useCallback((index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPhotoPreviews(newPhotos.map((p) => URL.createObjectURL(p)));
  }, [photos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!title.trim()) { setSubmitError("El titulo es obligatorio"); return; }
    if (!category) { setSubmitError("Selecciona una categoria"); return; }
    if (!province) { setSubmitError("Selecciona una provincia"); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      if (description.trim()) formData.append("description", description.trim());
      if (price.trim()) formData.append("price", price.trim());
      formData.append("currency", currency);
      if (phone.trim()) formData.append("phone", phone.trim());
      formData.append("province", province);
      if (municipality.trim()) formData.append("municipality", municipality.trim());
      formData.append("category", category);
      if (sellerName.trim()) formData.append("sellerName", sellerName.trim());
      photos.forEach((photo) => formData.append("photos", photo));

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/publish", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        router.push("/marketplace");
      } else {
        const errData = await res.json().catch(() => ({}));
        setSubmitError(errData.error || "Error al publicar");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setSubmitError("Tiempo de espera agotado. Intenta de nuevo.");
      } else {
        setSubmitError("Error de conexion. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/marketplace">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-base font-bold text-emerald-700">Publicar anuncio</h1>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error message */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-sm text-red-600">{submitError}</p>
              </div>
            )}

            {/* Photo upload */}
            <div>
              <Label className="text-sm font-semibold text-gray-800 mb-2 block">
                <Camera className="h-4 w-4 inline mr-1.5" />
                Fotos (maximo 5)
              </Label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) handlePhotoFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files) handlePhotoFiles(e.target.files); }}
                />
                <Upload className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Arrastra fotos aqui o haz clic para seleccionar</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG — Maximo 5 fotos</p>
              </div>
              {photoPreviews.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {photoPreviews.map((preview, i) => (
                    <div key={preview} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200">
                      <img src={preview} alt={`Vista previa ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                <Tag className="h-4 w-4 inline mr-1.5" />
                Titulo <span className="text-red-500">*</span>
              </Label>
              <Input id="title" placeholder="Ej: iPhone 15 Pro Max 256GB" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl" required />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-semibold text-gray-800 mb-1.5 block">Descripcion</Label>
              <Textarea id="description" placeholder="Describe tu producto con detalles..." value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl min-h-[100px] resize-none" rows={4} />
            </div>

            {/* Price & Currency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="price" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                  <DollarSign className="h-4 w-4 inline mr-1.5" />
                  Precio
                </Label>
                <Input id="price" type="number" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} className="h-11 rounded-xl" min="0" step="0.01" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">Moneda</Label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-11 w-full px-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:ring-2 focus:ring-emerald-300">
                  <option value="USD">USD ($)</option>
                  <option value="CUP">CUP</option>
                  <option value="EUR">EUR</option>
                  <option value="MLC">MLC</option>
                </select>
              </div>
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                <Phone className="h-4 w-4 inline mr-1.5" />
                Telefono (WhatsApp)
              </Label>
              <Input id="phone" type="tel" placeholder="Ej: +53 55512345" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl" />
            </div>

            {/* Province */}
            <div>
              <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">
                <MapPin className="h-4 w-4 inline mr-1.5" />
                Provincia <span className="text-red-500">*</span>
              </Label>
              <select value={province} onChange={(e) => setProvince(e.target.value)} className="h-11 w-full px-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:ring-2 focus:ring-emerald-300">
                <option value="">Selecciona provincia</option>
                {PROVINCIAS.map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>

            {/* Municipality */}
            <div>
              <Label htmlFor="municipality" className="text-sm font-semibold text-gray-800 mb-1.5 block">Municipio</Label>
              <Input id="municipality" placeholder="Ej: Playa, Centro Habana..." value={municipality} onChange={(e) => setMunicipality(e.target.value)} className="h-11 rounded-xl" />
            </div>

            {/* Category */}
            <div>
              <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">
                Categoria <span className="text-red-500">*</span>
              </Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 w-full px-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:ring-2 focus:ring-emerald-300">
                <option value="">Selecciona categoria</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
                ))}
              </select>
            </div>

            {/* Seller name */}
            <div>
              <Label htmlFor="sellerName" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                <User className="h-4 w-4 inline mr-1.5" />
                Tu nombre
              </Label>
              <Input id="sellerName" placeholder="Ej: Carlos Perez" value={sellerName} onChange={(e) => setSellerName(e.target.value)} className="h-11 rounded-xl" />
            </div>

            {/* Submit */}
            <Button type="submit" disabled={submitting} className="w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white text-base font-bold rounded-xl shadow-lg disabled:opacity-60">
              {submitting ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Publicando...</>
              ) : (
                <><Check className="h-5 w-5 mr-2" /> Publicar anuncio</>
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
