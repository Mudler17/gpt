import React, { useEffect } from "react";
import App32 from "./App32.jsx";

const VERSION = "App 3.1.1 · Render- und Redundanzbereinigung";

const getText = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
const visible = (el) => {
  if (!el) return false;
  const s = window.getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
};
const disable = (el, reason) => {
  if (!el || el.dataset.app331Done === "true") return;
  el.dataset.app331Done = "true";
  el.dataset.app331Reason = reason;
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
};
const scenarioSubnav = (el) => {
  const boxText = getText(el.closest("nav,div,section"));
  return /Dashboard/i.test(boxText) && /Vorlagen/i.test(boxText) && /Ausgangslage/i.test(boxText) && /Annahmen/i.test(boxText);
};

function cleanupNav() {
  document.querySelectorAll("button,a,[role='tab']").forEach((el) => {
    const t = getText(el);
    if (!t) return;
    if (scenarioSubnav(el) && /^(Import|Vergleich|Report|Bericht|Bericht\+)$/.test(t)) disable(el, "scenario-subnav-duplicate");
    if (t === "Vergleich") disable(el, "legacy-compare");
    if (t === "Report") disable(el, "legacy-report");
  });
}

function cleanupLabels() {
  document.querySelectorAll("h2,h3,h4,button,a,span,div").forEach((el) => {
    const t = getText(el);
    if (!t || t.length > 80) return;
    const boxText = getText(el.closest("section,aside,div"));
    if (t === "Report") el.textContent = "Bericht+";
    if (t === "Bericht" && /Verlaufssimulation|Phasen-Set|Kipppunkte|Ressourcenverlauf/i.test(boxText)) el.textContent = "Phasen-Export (Vorschau)";
    if (t === "Bericht kopieren" && /Vergleich\+/i.test(boxText)) el.textContent = "Auswertung kopieren";
  });
}

function cleanupPhases() {
  const instances = [...document.querySelectorAll("[data-phases20='true'],[data-phase-dashboard-instance]")].filter(visible);
  if (!instances.length) return;
  const main = instances[0].closest("[data-phases20='true']") || instances[0];
  instances.slice(1).forEach((el) => disable(el.closest("[data-phases20='true']") || el, "duplicate-phases20"));
  const parent = main.parentElement;
  if (parent) {
    [...parent.children].forEach((child) => {
      if (child === main || child.contains(main)) return;
      if (/Phasen bearbeiten|Kipppunkte|Ressourcenverlauf|Phasenbericht/i.test(getText(child))) disable(child, "native-phase-remainder");
    });
  }
}

function markVersion() {
  document.documentElement.dataset.appVersion = VERSION;
  let meta = document.querySelector("meta[name='app-version']");
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "app-version";
    document.head.appendChild(meta);
  }
  meta.content = VERSION;
}

function runCleanup() {
  markVersion();
  cleanupNav();
  cleanupLabels();
  cleanupPhases();
}

export default function App33() {
  useEffect(() => {
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(runCleanup);
    };
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <App32 />;
}
