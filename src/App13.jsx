import React from "react";
import App12 from "./App12.jsx";

export default function App13() {
  return (
    <>
      <App12 />
      <a
        href="/import-plus.html"
        target="_blank"
        rel="noreferrer"
        style={{
          position: "fixed",
          right: "18px",
          bottom: "234px",
          zIndex: 64,
          background: "#0f172a",
          color: "white",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: "999px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: 800,
          textDecoration: "none",
          boxShadow: "0 10px 30px rgba(15,23,42,.25)"
        }}
        title="Import+ für TXT, MD, JSON, DOCX und PDF"
      >
        Import+
      </a>
    </>
  );
}
