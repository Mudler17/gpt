import React, { useEffect } from "react";
import App28 from "./App28.jsx";

function hideElement(el) {
  if (!el) return;
  el.dataset.app30Hidden = "true";
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
}

function normalizeVisibleApp() {
  // Sichtbare Entwicklungs- und Build-Hinweise entfernen.
  const versionPatterns = [
    /KI-Kernel GPT\s*\d+(\.\d+)*/i,
    /App\s*\d+(\.\d+)*/i,
    /Backup\s*\d+(\.\d+)*/i,
    /DB-Viewer\s*\d+(\.\d+)*/i,
    /DB-Setup\s*\d+(\.\d+)*/i,
    /Projektakte\s*\d+(\.\d+)*/i,
    /DB-Lesemodus\s*\d+(\.\d+)*/i
  ];

  document.querySelectorAll("body *").forEach((el) => {
    if (!el || el.dataset.app30Checked === "true") return;
    const text = (el.textContent || "").trim();
    if (text && text.length <= 110 && versionPatterns.some((pattern) => pattern.test(text))) {
      hideElement(el);
    }
    el.dataset.app30Checked = "true";
  });

  // Nur Vergleich+ als Vergleichseinstieg sichtbar lassen.
  document.querySelectorAll("button,a,[role='tab'],nav *,aside *").forEach((el) => {
    if (!el || el.dataset.app30CompareChecked === "true") return;
    const text = (el.textContent || "").trim();
    if (text === "Vergleich") hideElement(el);
    el.dataset.app30CompareChecked = "true";
  });

  // Kopfbereich etwas kompakter halten, ohne Fachmodule zu verändern.
  [...document.querySelectorAll("h1")].forEach((h) => {
    const text = h.textContent || "";
    if (/Beratungsfähiger Organisationssimulator/i.test(text)) {
      h.style.fontSize = "clamp(30px, 3.5vw, 48px)";
      h.style.lineHeight = "1.02";
      h.style.marginTop = "6px";
      h.style.marginBottom = "6px";
      const box = h.closest("section, header, div");
      if (box) {
        box.style.paddingTop = "30px";
        box.style.paddingBottom = "26px";
      }
    }
  });

  // Vergleich+ als zentralen Ort markieren, ohne neue UI-Fläche zu erzeugen.
  document.querySelectorAll("button,a,h2,h3,div,span").forEach((el) => {
    if (!el || el.dataset.app30CentralCompare === "true") return;
    const text = (el.textContent || "").trim();
    if (text === "Vergleich+") {
      el.dataset.app30CentralCompare = "true";
      el.setAttribute("title", "Zentraler Szenariovergleich");
    }
  });
}

export default function App30() {
  useEffect(() => {
    const run = () => normalizeVisibleApp();
    run();
    const timer = window.setInterval(run, 900);
    return () => window.clearInterval(timer);
  }, []);

  return <App28 />;
}
