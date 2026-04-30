import React from "react";

export default function Loading() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "80vh",
      padding: "20px",
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: "3px solid #e5e7eb",
        borderTop: "3px solid #10b981",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ marginTop: 16, fontSize: 13, color: "#9ca3af" }}>Cargando...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
