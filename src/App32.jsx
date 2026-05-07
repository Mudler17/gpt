import React, { useEffect } from "react";
import App31 from "./App31.jsx";

const HERO_SUBTITLE = "Szenarien, Ressourcen, Interventionen und Verläufe beratungsfähig modellieren.";

function hideElement(el) {
  if (!el || el.dataset.app31Hidden === "true") return;
  el.dataset.app31Hidden = "true";
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
}

function setText(el, value) {
  if (!el || el.textContent?.trim() === value) return;
  el.textContent = value;
}

function normalizeHero() {
  const h1 = [...document.querySelectorAll("h1")].find((el) => /Beratungsfähiger Organisationssimulator/i.test(el.textContent || ""));
  if (!h1) return;
  const box = h1.closest("section,header,div");
  if (!box) return;
  const subtitle = [...box.querySelectorAll("p,span,div")].find((el) => {
    const text = (el.textContent || "").trim();
    return text.length > 15 && text.length < 190 && /Phasen-Sets|Szenarien|Ressourcen|Interventionen|Verläufe|modellieren/i.test(text);
  });
  if (subtitle) setText(subtitle, HERO_SUBTITLE);
}

function hideDuplicateTopTabs() {
  // Kernregel: links im Modulmenü bleiben zentrale Einstiegspunkte erhalten;
  // horizontale Szenario-Tabs werden von Redundanzen befreit.
  document.querySelectorAll("button,a,[role='tab']").forEach((el) => {
    if (!el || el.dataset.app31NavChecked === "true") return;
    el.dataset.app31NavChecked = "true";

    const text = (el.textContent || "").trim();
    if (!text) return;

    const bar = el.closest("nav,div,section");
    const barText = (bar?.textContent || "").trim();
    const isScenarioTabBar =
      /Dashboard/i.test(barText) &&
      /Vorlagen/i.test(barText) &&
      /Ausgangslage/i.test(barText) &&
      /Annahmen/i.test(barText);

    if (!isScenarioTabBar) return;

    if (text === "Import" || text === "Vergleich" || text === "Report" || text === "Bericht" || text === "Bericht+") hideElement(el);
  });
}

function normalizeTerminology() {
  document.querySelectorAll("button,a,[role='tab'],h2,h3,h4,span,div,label").forEach((el) => {
    if (!el || el.dataset.app31TermChecked === "true") return;
    el.dataset.app31TermChecked = "true";
    const text = (el.textContent || "").trim();
    if (!text || text.length > 80) return;

    if (text === "Report") setText(el, "Bericht+");
    if (text === "Reports") setText(el, "Berichte");
    if (text === "Speichern und Laden") setText(el, "Speicher");
    if (text === "Standardszenarien") setText(el, "Vorlagen");
  });
}

function ensureSinglePrimaryEntries() {
  // Systembereich soll technische Funktionen bündeln, aber keine fachlichen Arbeitsmodule duplizieren.
  document.querySelectorAll("button,a,div,span").forEach((el) => {
    if (!el || el.dataset.app31PrimaryChecked === "true") return;
    el.dataset.app31PrimaryChecked = "true";
    const text = (el.textContent || "").trim();
    const parentText = (el.parentElement?.textContent || "").trim();

    if (text === "Vergleich" && /System/i.test(parentText)) hideElement(el);
    if (text === "Import" && /Dashboard/i.test(parentText) && /Vorlagen/i.test(parentText)) hideElement(el);
    if ((text === "Report" || text === "Bericht" || text === "Bericht+") && /Dashboard/i.test(parentText) && /Vorlagen/i.test(parentText)) hideElement(el);
  });
}

function cleanupVisibleNavigation() {
  normalizeHero();
  hideDuplicateTopTabs();
  normalizeTerminology();
  ensureSinglePrimaryEntries();
}

export default function App32() {
  useEffect(() => {
    let raf = 0;
    const run = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(cleanupVisibleNavigation);
    };
    run();
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.addedNodes?.length || m.type === "characterData" || m.type === "attributes")) run();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <App31 />;
}
