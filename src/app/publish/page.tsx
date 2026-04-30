"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, apiUpload, CATEGORY_LABELS, ALL_CATEGORIES } from "@/lib/proxy";
import { PROVINCIAS } from "@/lib/platforms";
import { toast } from "@/hooks/use-toast";

export default function PublishPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<string[]>(ALL_CATEGORIES);
  const [dragOver, setDragOver] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Form state
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
    apiFetch("/api/categories")
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Proxy returns objects {id, name, icon} — extract just the IDs
          const cats = data.map((c: any) => (typeof c === 'string' ? c : c.id)).filter(Boolean);
          if (cats.length > 0) setCategories(cats);
        }
      })
      .catch(() => {});
  }, []);

  const handlePhotoFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((f) =>
      f.type.startsWith("image/")
    );
    const newPhotos = [...photos, ...validFiles].slice(0, 5);
    setPhotos(newPhotos);

    // Generate previews
    const newPreviews = newPhotos.map((p) => URL.createObjectURL(p));
    setPhotoPreviews(newPreviews);
  }, [photos]);

  const removePhoto = useCallback(
    (index: number) => {
      const newPhotos = photos.filter((_, i) => i !== index);
      setPhotos(newPhotos);
      const newPreviews = newPhotos.map((p) => URL.createObjectURL(p));
      setPhotoPreviews(newPreviews);
    },
    [photos]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Campo requerido",
        description: "El título es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Campo requerido",
        description: "Selecciona una categoría",
        variant: "destructive",
      });
      return;
    }

    if (!province) {
      toast({
        title: "Campo requerido",
        description: "Selecciona una provincia",
        variant: "destructive",
      });
      return;
    }

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

      photos.forEach((photo) => {
        formData.append("photos", photo);
      });

      const res = await apiUpload("/api/publish", formData);
      if (res.ok) {
        toast({
          title: "¡Anuncio publicado!",
          description: "Tu anuncio se ha publicado exitosamente.",
        });
        router.push("/marketplace");
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al publicar el anuncio");
      }
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "No se pudo publicar el anuncio. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className="text-base font-bold text-emerald-700">
            Publicar anuncio
          </h1>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Photo upload */}
            <div>
              <Label className="text-sm font-semibold text-gray-800 mb-2 block">
                <Camera className="h-4 w-4 inline mr-1.5" />
                Fotos (máximo 5)
              </Label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files) {
                    handlePhotoFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handlePhotoFiles(e.target.files);
                  }}
                />
                <Upload className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  Arrastra fotos aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG — Máximo 5 fotos
                </p>
              </div>

              {/* Previews */}
              <AnimatePresence>
                {photoPreviews.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {photoPreviews.map((preview, i) => (
                      <motion.div
                        key={preview}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200"
                      >
                        <img
                          src={preview}
                          alt={`Vista previa ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto(i);
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                <Tag className="h-4 w-4 inline mr-1.5" />
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ej: iPhone 15 Pro Max 256GB"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                Descripción
              </Label>
              <Textarea
                id="description"
                placeholder="Describe tu producto con detalles..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl min-h-[100px] resize-none"
                rows={4}
              />
            </div>

            {/* Price & Currency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="price" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                  <DollarSign className="h-4 w-4 inline mr-1.5" />
                  Precio
                </Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-11 rounded-xl"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">
                  Moneda
                </Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="CUP">CUP</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="MLC">MLC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                <Phone className="h-4 w-4 inline mr-1.5" />
                Teléfono (WhatsApp)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Ej: +53 55512345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Incluye el código de país (+53 para Cuba)
              </p>
            </div>

            {/* Province */}
            <div>
              <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">
                <MapPin className="h-4 w-4 inline mr-1.5" />
                Provincia <span className="text-red-500">*</span>
              </Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecciona provincia" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCIAS.map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Municipality */}
            <div>
              <Label htmlFor="municipality" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                Municipio
              </Label>
              <Input
                id="municipality"
                placeholder="Ej: Playa, Centro Habana..."
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Category */}
            <div>
              <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">
                Categoría <span className="text-red-500">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seller name */}
            <div>
              <Label htmlFor="sellerName" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                <User className="h-4 w-4 inline mr-1.5" />
                Tu nombre
              </Label>
              <Input
                id="sellerName"
                placeholder="Ej: Carlos Pérez"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white text-base font-bold rounded-xl shadow-lg disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Publicar anuncio
                </>
              )}
            </Button>
          </motion.form>
        </div>
      </main>
    </div>
  );
}
