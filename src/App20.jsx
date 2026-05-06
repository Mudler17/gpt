import React from "react";
import App19 from "./App19.jsx";

export default function App20() {
  return (
    <>
      <App19 />
      <a
        href="/backup.html"
        target="_blank"
        rel="noreferrer"
        style={{
          position: "fixed",
          left: "18px",
          bottom: "18px",
          zIndex: 90,
          background: "#020617",
          color: "white",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: "999px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: 900,
          textDecoration: "none",
          boxShadow: "0 10px 30px rgba(15,23,42,.28)"
        }}
        title="Backup, Export, Import und Datenmodell-Check"
      >
        Backup 1.5
      </a>
    </>
  );
}
