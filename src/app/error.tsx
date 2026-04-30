"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f0fdf4" }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "20px",
          textAlign: "center",
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "linear-gradient(135deg, #10b981, #3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            fontSize: 28,
          }}>
            &#9888;
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#065f46", marginBottom: 8 }}>
            CubaFinder
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20, maxWidth: 320 }}>
            Ocurri&#243; un error. Intenta recargar la p&#225;gina.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #10b981, #3b82f6)",
              color: "white",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          <a href="/" style={{ marginTop: 12, color: "#059669", fontSize: 13, textDecoration: "none" }}>
            Ir al inicio
          </a>
        </div>
      </body>
    </html>
  );
}
