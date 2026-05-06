import React from "react";
import App20 from "./App20.jsx";

export default function App21() {
  return (
    <>
      <App20 />
      <a
        href="/projekte.html"
        target="_blank"
        rel="noreferrer"
        style={{
          position: "fixed",
          left: "18px",
          bottom: "72px",
          zIndex: 91,
          background: "#1e293b",
          color: "white",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: "999px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: 900,
          textDecoration: "none",
          boxShadow: "0 10px 30px rgba(15,23,42,.28)"
        }}
        title="Projektakte: Projekte anlegen, Szenarien zuordnen, Dossier exportieren"
      >
        Projektakte 1.6
      </a>
    </>
  );
}
