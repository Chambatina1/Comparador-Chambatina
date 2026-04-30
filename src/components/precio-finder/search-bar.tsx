"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Camera,
  Link2,
  X,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onImageUpload: (file: File) => void;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, onImageUpload, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteUrl, setPasteUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePasteUrl = () => {
    if (pasteUrl.trim()) {
      // Extract product name from URL or use URL directly
      onSearch(pasteUrl.trim());
      setShowPasteDialog(false);
      setPasteUrl("");
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPasteUrl(text);
      }
    } catch {
      // Clipboard access denied
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="¿Qué producto buscas? Ej: AirPods Pro..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-4 h-12 text-base rounded-xl border-2 border-amber-200 focus:border-amber-400 bg-white shadow-sm transition-colors"
              disabled={isLoading}
            />
          </div>

          <motion.div whileTap={{ scale: 0.95 }} className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Subir foto del producto"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              ) : (
                <Camera className="h-5 w-5 text-amber-600" />
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-colors"
              onClick={() => setShowPasteDialog(true)}
              disabled={isLoading}
              title="Pegar enlace del producto"
            >
              <Link2 className="h-5 w-5 text-amber-600" />
            </Button>
          </motion.div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <Button
          type="submit"
          className="w-full mt-3 h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25 transition-all"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Buscando precios...
            </>
          ) : (
            <>
              <Search className="h-5 w-5 mr-2" />
              Comparar Precios
            </>
          )}
        </Button>
      </form>

      {/* Paste URL Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-amber-500" />
              Pegar enlace del producto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pega un enlace de un producto de Facebook, TikTok, Amazon o cualquier tienda online.
            </p>
            <Input
              type="url"
              placeholder="https://www.amazon.com/dp/..."
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              className="h-11 rounded-lg"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePasteFromClipboard}
                className="flex-1"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Pegar del portapapeles
              </Button>
              <Button
                onClick={handlePasteUrl}
                disabled={!pasteUrl.trim()}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
