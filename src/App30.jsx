import React, { useEffect } from "react";
import App28 from "./App28.jsx";

function hideElement(el) {
  if (!el || el.dataset.app30Hidden === "true") return;
  el.dataset.app30Hidden = "true";
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
}

function isNavigationArea(el) {
  return Boolean(el?.closest?.("nav,aside,[role='navigation']"));
}

function isInsideCentralImportModule(el) {
  const container = el?.closest?.("section,main,div");
  const text = (container?.textContent || "").slice(0, 1800);
  return /Eingabe/i.test(text) && /Import\+|Dokumentimport|Dateiimport/i.test(text);
}

function scenarioContextOf(el) {
  let node = el;
  for (let i = 0; i < 7 && node; i += 1) {
    const text = (node.textContent || "").trim();
    if (/Szenario/i.test(text) && !/Eingabe/i.test(text) && !/System/i.test(text)) return { node, text };
    node = node.parentElement;
  }
  return null;
}

function hideHorizontalScenarioImportTab() {
  document.querySelectorAll("button,a,[role='tab']").forEach((el) => {
    if (!el || el.dataset.app30Hidden === "true") return;
    if (isNavigationArea(el)) return;

    const text = (el.textContent || "").trim();
    if (text !== "Import") return;

    const tabBar = el.closest("nav,div,section");
    const tabText = (tabBar?.textContent || "").trim();
    const looksLikeScenarioTabs =
      /Dashboard/i.test(tabText) &&
      /Vorlagen/i.test(tabText) &&
      /Ausgangslage/i.test(tabText) &&
      /Annahmen/i.test(tabText);

    if (looksLikeScenarioTabs) hideElement(el);
  });
}

function hideScenarioHeaderImport() {
  hideHorizontalScenarioImportTab();

  document.querySelectorAll("button,a,[role='button']").forEach((el) => {
    if (!el || el.dataset.app30Hidden === "true") return;
    if (isNavigationArea(el)) return;
    if (isInsideCentralImportModule(el)) return;

    const text = (el.textContent || "").trim();
    const title = (el.getAttribute("title") || "").trim();
    const aria = (el.getAttribute("aria-label") || "").trim();
    const label = `${text} ${title} ${aria}`.trim();

    if (!/Import\+?|Dokumentimport|Dateiimport|Datei hochladen|Upload|importieren/i.test(label)) return;
    if (/speichern|laden|duplizieren|löschen|vergleich|bericht|phase|kopieren|export/i.test(label.toLowerCase())) return;

    const scenarioContext = scenarioContextOf(el);
    if (!scenarioContext) return;

    hideElement(el);

    const possibleCard = el.closest("div,section,header");
    if (possibleCard) {
      const cardText = (possibleCard.textContent || "").trim();
      const compactEnough = cardText.length > 0 && cardText.length < 900;
      const importCard = /Import\+?|Dokumentimport|Dateiimport|Datei hochladen|Upload|importieren/i.test(cardText);
      const scenarioCard = /Szenario|Haupt-App|übernehmen/i.test(cardText);
      const notNavOrCentralImport = !isNavigationArea(possibleCard) && !isInsideCentralImportModule(possibleCard);
      if (compactEnough && importCard && scenarioCard && notNavOrCentralImport) hideElement(possibleCard);
    }
  });

  document.querySelectorAll("section,header,div").forEach((el) => {
    if (!el || el.dataset.app30Hidden === "true") return;
    if (isNavigationArea(el)) return;
    if (isInsideCentralImportModule(el)) return;

    const text = (el.textContent || "").trim();
    if (text.length < 8 || text.length > 900) return;
    if (!/Import\+?|Dokumentimport|Dateiimport|Datei hochladen|Upload|importieren/i.test(text)) return;
    if (!/Szenario|Haupt-App|übernehmen|Ausgangslage/i.test(text)) return;
    if (/Eingabe|System|Module|Modul/i.test(text)) return;

    hideElement(el);
  });
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

  hideScenarioHeaderImport();

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
      const relevant = mutations.some((m) =>
        (m.addedNodes && m.addedNodes.length > 0) || m.type === "characterData" || m.type === "attributes"
      );
      if (relevant) run();
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <App28 />;
}
