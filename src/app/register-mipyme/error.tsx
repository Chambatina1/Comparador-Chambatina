"use client";

import React from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "80vh",
      padding: "20px",
      textAlign: "center",
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 16,
        background: "#fee2e2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        fontSize: 24,
      }}>
        !
      </div>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
        Error al cargar. Intenta de nuevo.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "8px 20px",
          borderRadius: 10,
          background: "#10b981",
          color: "white",
          border: "none",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Reintentar
      </button>
      <a href="/" style={{ marginTop: 12, color: "#059669", fontSize: 12 }}>
        Volver al inicio
      </a>
    </div>
  );
}
