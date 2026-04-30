"use client";

import { platforms, type Platform } from "@/lib/platforms";

interface PlatformBadgeProps {
  platformId: string;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PlatformBadge({
  platformId,
  showName = true,
  size = "sm",
}: PlatformBadgeProps) {
  const platform = platforms.find((p) => p.id === platformId);

  if (!platform) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 ${
          size === "sm" ? "px-2 py-0.5 text-xs" : size === "md" ? "px-3 py-1 text-sm" : "px-4 py-1.5 text-base"
        }`}
      >
        🔗 Tienda
      </span>
    );
  }

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-xs"
      : size === "md"
        ? "px-3 py-1 text-sm"
        : "px-4 py-1.5 text-base";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`}
      style={{
        backgroundColor: platform.bgColor,
        color: platform.color,
      }}
    >
      <span className="text-xs">{platform.logo}</span>
      {showName && <span>{platform.name}</span>}
    </span>
  );
}

export function PlatformLogo({ platformId, size = 24 }: { platformId: string; size?: number }) {
  const platform = platforms.find((p) => p.id === platformId);
  if (!platform) return <span style={{ fontSize: size }}>🔗</span>;

  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{
        width: size,
        height: size,
        backgroundColor: platform.bgColor,
        fontSize: size * 0.5,
      }}
    >
      {platform.logo}
    </div>
  );
}

export function PlatformGrid() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {platforms.map((p) => (
        <PlatformBadge key={p.id} platformId={p.id} size="md" />
      ))}
    </div>
  );
}
