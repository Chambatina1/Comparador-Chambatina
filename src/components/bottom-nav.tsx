"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, PlusCircle, Building2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Buscar", icon: Search },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/publish", label: "Publicar", icon: PlusCircle },
  { href: "/mipymes", label: "Mipymes", icon: Building2 },
  { href: "/register-mipyme", label: "Mi Negocio", icon: Briefcase },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide bottom nav on detail pages if desired
  const hideOn = ["/marketplace/"];
  const shouldHide = hideOn.some((p) => pathname.startsWith(p) && pathname !== p);

  if (shouldHide) return null;

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around px-1 pt-1 pb-[env(safe-area-inset-bottom,4px)]">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href) && item.href !== "/";
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[56px]",
                  isActive
                    ? "text-emerald-600"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-6 h-6 transition-all",
                    isActive && "bg-emerald-100 rounded-lg"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "text-emerald-600")} />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-tight",
                    isActive ? "text-emerald-600" : "text-gray-400"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop top nav */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
              <Search className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-emerald-700 leading-tight">
                CubaFinder
              </h1>
              <p className="text-[9px] text-muted-foreground -mt-0.5">
                Marketplace + Mipymes Cuba
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href) && item.href !== "/";
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Desktop spacer */}
      <div className="hidden md:block h-14" />
    </>
  );
}
