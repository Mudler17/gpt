import React from "react";
import App13 from "./App13.jsx";

export default function App14() {
  return (
    <>
      <App13 />
      <a
        href="/beratung.html"
        target="_blank"
        rel="noreferrer"
        style={{
          position: "fixed",
          right: "18px",
          bottom: "288px",
          zIndex: 65,
          background: "#1e293b",
          color: "white",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: "999px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: 800,
          textDecoration: "none",
          boxShadow: "0 10px 30px rgba(15,23,42,.25)"
        }}
        title="Persönlicher Beratungsmodus mit Fallakte, Notizen und nächsten Schritten"
      >
        Beratung
      </a>
    </>
  );
}
