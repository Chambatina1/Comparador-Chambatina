"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Camera,
  Check,
  MapPin,
  User,
  Phone,
  MessageCircle,
  Mail,
  Instagram,
  Facebook,
  Send,
  Clock,
  FileText,
  Briefcase,
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

export default function RegisterMipymePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<string[]>(ALL_CATEGORIES);
  const [dragOver, setDragOver] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [telegram, setTelegram] = useState("");
  const [services, setServices] = useState("");
  const [schedule, setSchedule] = useState("");

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

  const handleLogoFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Campo requerido",
        description: "El nombre del negocio es obligatorio",
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
      formData.append("name", name.trim());
      if (description.trim()) formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("province", province);
      if (municipality.trim()) formData.append("municipality", municipality.trim());
      if (address.trim()) formData.append("address", address.trim());
      if (phone.trim()) formData.append("phone", phone.trim());
      if (whatsapp.trim()) formData.append("whatsapp", whatsapp.trim());
      if (email.trim()) formData.append("email", email.trim());
      if (instagram.trim()) formData.append("instagram", instagram.trim());
      if (facebook.trim()) formData.append("facebook", facebook.trim());
      if (telegram.trim()) formData.append("telegram", telegram.trim());
      if (services.trim()) formData.append("services", services.trim());
      if (schedule.trim()) formData.append("schedule", schedule.trim());
      if (logoFile) formData.append("logo", logoFile);

      const res = await apiUpload("/api/register-mipyme", formData);
      if (res.ok) {
        toast({
          title: "¡Negocio registrado!",
          description: "Tu negocio ha sido registrado exitosamente.",
        });
        router.push("/mipymes");
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al registrar el negocio");
      }
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "No se pudo registrar el negocio. Intenta de nuevo.",
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
          <Link href="/mipymes">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-base font-bold text-emerald-700">
            Registrar mi negocio
          </h1>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Logo upload */}
            <div>
              <Label className="text-sm font-semibold text-gray-800 mb-2 block">
                <Camera className="h-4 w-4 inline mr-1.5" />
                Logo del negocio
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
                  if (e.dataTransfer.files?.[0]) {
                    handleLogoFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleLogoFile(e.target.files[0]);
                  }}
                />
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-20 h-20 rounded-xl object-cover border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLogoFile(null);
                        setLogoPreview(null);
                      }}
                      className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Quitar logo
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 mx-auto text-gray-300 mb-1" />
                    <p className="text-xs text-gray-500">
                      Arrastra tu logo o haz clic para seleccionar
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Business name */}
            <div>
              <Label htmlFor="name" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                <Briefcase className="h-4 w-4 inline mr-1.5" />
                Nombre del negocio <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ej: TeknoCuba, La Habana Tech..."
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                placeholder="Describe tu negocio..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl min-h-[80px] resize-none"
                rows={3}
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

            {/* Province & Municipality */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">
                  <MapPin className="h-4 w-4 inline mr-1.5" />
                  Provincia <span className="text-red-500">*</span>
                </Label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Provincia" />
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
              <div>
                <Label htmlFor="municipality" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                  Municipio
                </Label>
                <Input
                  id="municipality"
                  placeholder="Municipio"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                Dirección
              </Label>
              <Input
                id="address"
                placeholder="Ej: Calle 23 #456, Vedado"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Phone & WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                  <Phone className="h-4 w-4 inline mr-1.5" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+53 55512345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="whatsapp" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                  <MessageCircle className="h-4 w-4 inline mr-1.5" />
                  WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="+53 55512345"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                <Mail className="h-4 w-4 inline mr-1.5" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="negocio@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Social media */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">
                Redes sociales
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="instagram" className="text-xs text-muted-foreground mb-1 block">
                    <Instagram className="h-3 w-3 inline mr-1" />
                    Instagram (sin @)
                  </Label>
                  <Input
                    id="instagram"
                    placeholder="mi_negocio"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="facebook" className="text-xs text-muted-foreground mb-1 block">
                    <Facebook className="h-3 w-3 inline mr-1" />
                    Facebook (nombre de página)
                  </Label>
                  <Input
                    id="facebook"
                    placeholder="MiNegocio"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="telegram" className="text-xs text-muted-foreground mb-1 block">
                  <Send className="h-3 w-3 inline mr-1" />
                  Telegram (sin @)
                </Label>
                <Input
                  id="telegram"
                  placeholder="mi_negocio"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Services */}
            <div>
              <Label htmlFor="services" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                <FileText className="h-4 w-4 inline mr-1.5" />
                Servicios que ofrece
              </Label>
              <Textarea
                id="services"
                placeholder="Ej: Reparación de celulares, venta de accesorios..."
                value={services}
                onChange={(e) => setServices(e.target.value)}
                className="rounded-xl min-h-[80px] resize-none"
                rows={3}
              />
            </div>

            {/* Schedule */}
            <div>
              <Label htmlFor="schedule" className="text-sm font-semibold text-gray-800 mb-1.5 block">
                <Clock className="h-4 w-4 inline mr-1.5" />
                Horario
              </Label>
              <Input
                id="schedule"
                placeholder="Ej: Lun-Vie 9:00-17:00, Sáb 9:00-12:00"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
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
                  Registrando...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Registrar negocio
                </>
              )}
            </Button>
          </motion.form>
        </div>
      </main>
    </div>
  );
}
