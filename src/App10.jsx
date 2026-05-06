import React from "react";
import App9 from "./App9.jsx";

export default function App10() {
  return (
    <>
      <App9 />
      <a
        href="/phasenmodell.html"
        target="_blank"
        rel="noreferrer"
        style={{
          position: "fixed",
          right: "18px",
          bottom: "72px",
          zIndex: 61,
          background: "#334155",
          color: "white",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: "999px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: 800,
          textDecoration: "none",
          boxShadow: "0 10px 30px rgba(15,23,42,.25)"
        }}
        title="Phasenmodell mit Ressourcenverlauf und Kipppunkten"
      >
        Phasen
      </a>
    </>
  );
}
