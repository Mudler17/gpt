import React from "react";
import App11 from "./App11.jsx";

export default function App12() {
  return (
    <>
      <App11 />
      <a
        href="/bericht-plus.html"
        target="_blank"
        rel="noreferrer"
        style={{
          position: "fixed",
          right: "18px",
          bottom: "180px",
          zIndex: 63,
          background: "#64748b",
          color: "white",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: "999px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: 800,
          textDecoration: "none",
          boxShadow: "0 10px 30px rgba(15,23,42,.25)"
        }}
        title="Beratungsbericht mit Arbeitsreport und Management-Briefing"
      >
        Bericht+
      </a>
    </>
  );
}
