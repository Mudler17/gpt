import React, { useEffect } from "react";
import App28 from "./App28.jsx";

function hideElement(el) {
  if (!el || el.dataset.app30Hidden === "true") return;
  el.dataset.app30Hidden = "true";
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
}

function normalizeVisibleApp() {
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
    if (text && text.length <= 110 && versionPatterns.some((pattern) => pattern.test(text))) hideElement(el);
    el.dataset.app30Checked = "true";
  });

  document.querySelectorAll("button,a,[role='tab'],nav *,aside *").forEach((el) => {
    if (!el || el.dataset.app30CompareChecked === "true") return;
    const text = (el.textContent || "").trim();
    if (text === "Vergleich") hideElement(el);
    el.dataset.app30CompareChecked = "true";
  });

  [...document.querySelectorAll("h1")].forEach((h) => {
    if (h.dataset.app30HeroCompact === "true") return;
    const text = h.textContent || "";
    if (/Beratungsfähiger Organisationssimulator/i.test(text)) {
      h.dataset.app30HeroCompact = "true";
      h.style.fontSize = "clamp(30px, 3.5vw, 48px)";
      h.style.lineHeight = "1.02";
      h.style.marginTop = "6px";
      h.style.marginBottom = "6px";
      const box = h.closest("section, header, div");
      if (box && box.dataset.app30HeroBoxCompact !== "true") {
        box.dataset.app30HeroBoxCompact = "true";
        box.style.paddingTop = "30px";
        box.style.paddingBottom = "26px";
      }
    }
  });

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
    let raf = 0;
    const run = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(normalizeVisibleApp);
    };

    run();

    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((m) => m.addedNodes && m.addedNodes.length > 0);
      if (relevant) run();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <App28 />;
}
