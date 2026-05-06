import React from "react";
import App8 from "./App8.jsx";

export default function App9() {
  return (
    <>
      <App8 />
      <a
        href="/vergleich-plus.html"
        target="_blank"
        rel="noreferrer"
        style={{
          position: "fixed",
          right: "18px",
          bottom: "18px",
          zIndex: 60,
          background: "#020617",
          color: "white",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: "999px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: 800,
          textDecoration: "none",
          boxShadow: "0 10px 30px rgba(15,23,42,.28)"
        }}
        title="Erweiterter A/B/C-Vergleich mit Beratungsbericht"
      >
        Vergleich+
      </a>
    </>
  );
}
