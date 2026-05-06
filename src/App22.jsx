import React from "react";
import App21 from "./App21.jsx";

export default function App22() {
  return (
    <>
      <App21 />
      <a
        href="/db-setup.html"
        target="_blank"
        rel="noreferrer"
        style={{
          position: "fixed",
          left: "18px",
          bottom: "126px",
          zIndex: 92,
          background: "#334155",
          color: "white",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: "999px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: 900,
          textDecoration: "none",
          boxShadow: "0 10px 30px rgba(15,23,42,.28)"
        }}
        title="DB-Setup und Backup-Import vorbereiten"
      >
        DB-Setup 1.9
      </a>
    </>
  );
}
