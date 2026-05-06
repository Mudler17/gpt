import React from "react";
import App10 from "./App10.jsx";

export default function App11() {
  return (
    <>
      <App10 />
      <a
        href="/beziehungsmodell.html"
        target="_blank"
        rel="noreferrer"
        style={{
          position: "fixed",
          right: "18px",
          bottom: "126px",
          zIndex: 62,
          background: "#475569",
          color: "white",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: "999px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: 800,
          textDecoration: "none",
          boxShadow: "0 10px 30px rgba(15,23,42,.25)"
        }}
        title="Beziehungsmodell mit Koalitionen, Konfliktachsen und Brückenrollen"
      >
        Beziehungen
      </a>
    </>
  );
}
