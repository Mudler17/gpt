import React from "react";
import App22 from "./App22.jsx";

export default function App23() {
  return (
    <>
      <App22 />
      <a
        href="/db-viewer.html"
        target="_blank"
        rel="noreferrer"
        style={{
          position: "fixed",
          left: "18px",
          bottom: "180px",
          zIndex: 93,
          background: "#475569",
          color: "white",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: "999px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: 900,
          textDecoration: "none",
          boxShadow: "0 10px 30px rgba(15,23,42,.28)"
        }}
        title="DB-Viewer: Datenbankbestand lesen, Zuordnungen prüfen, Hybridbetrieb vorbereiten"
      >
        DB-Viewer 2.2
      </a>
    </>
  );
}
