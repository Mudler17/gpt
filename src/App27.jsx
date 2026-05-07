import React, { useEffect } from "react";
import App19 from "./App19.jsx";

const systemTools = [
  { title: "Datenbank", desc: "DB-Szenarien lesen und lokale Kopien kontrolliert aktualisieren.", action: "db-panel" },
  { title: "Projektakte", desc: "Projektansicht, Szenariozuordnung und Dossier.", href: "/projekte.html" },
  { title: "Backup", desc: "Export, Import und Datenmodellprüfung.", href: "/backup.html" },
  { title: "DB-Prüfung", desc: "Datenbankbestand, Zuordnungen und Audit-Log prüfen.", href: "/db-viewer.html" },
  { title: "DB-Setup", desc: "Datenbankschema und Backup-Import verwalten.", href: "/db-setup.html" }
];

function esc(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c]));
}

function pill(text, tone = "info") {
  const colors = {
    ok: "border-color:#bbf7d0;background:#ecfdf5;color:#065f46",
    warn: "border-color:#fde68a;background:#fffbeb;color:#92400e",
    bad: "border-color:#fecdd3;background:#fff1f2;color:#9f1239",
    info: "border-color:#bfdbfe;background:#eff6ff;color:#1e40af"
  };
  return `<span style="display:inline-flex;border:1px solid;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:850;${colors[tone] || colors.info}">${esc(text)}</span>`;
}

function removeBuildLabels() {
  const patterns = [
    /KI-Kernel GPT\s*\d+(\.\d+)*/i,
    /Backup\s*\d+(\.\d+)*/i,
    /DB-Viewer\s*\d+(\.\d+)*/i,
    /DB-Setup\s*\d+(\.\d+)*/i,
    /Projektakte\s*\d+(\.\d+)*/i,
    /DB-Lesemodus\s*\d+(\.\d+)*/i
  ];
  document.querySelectorAll("body *").forEach((el) => {
    if (!el || el.dataset?.cleanedVersionLabel === "true") return;
    const text = (el.textContent || "").trim();
    if (!text || text.length > 90) return;
    if (patterns.some((p) => p.test(text))) {
      el.dataset.cleanedVersionLabel = "true";
      el.style.display = "none";
    }
  });
}

function hideRedundantCompareEntrypoints() {
  document.querySelectorAll("button,a,[role='tab'],nav *").forEach((el) => {
    if (!el || el.dataset?.compareCleaned === "true") return;
    const text = (el.textContent || "").trim();
    if (text === "Vergleich") {
      el.dataset.compareCleaned = "true";
      el.style.display = "none";
      el.setAttribute("aria-hidden", "true");
    }
  });
}

function markComparePlusAsCentral() {
  document.querySelectorAll("button,a,div,span,h2,h3").forEach((el) => {
    if (!el || el.dataset?.compareCentralMarked === "true") return;
    const text = (el.textContent || "").trim();
    if (text === "Vergleich+") {
      el.dataset.compareCentralMarked = "true";
      el.title = "Zentraler Szenariovergleich";
    }
  });
}

function reduceHero() {
  [...document.querySelectorAll("h1")].forEach((h) => {
    const text = h.textContent || "";
    if (/Beratungsfähiger Organisationssimulator/i.test(text)) {
      h.style.fontSize = "clamp(30px, 3.6vw, 50px)";
      h.style.lineHeight = "1.02";
      h.style.marginTop = "8px";
      h.style.marginBottom = "6px";
      const section = h.closest("section, header, div");
      if (section) {
        section.style.paddingTop = "34px";
        section.style.paddingBottom = "28px";
      }
    }
  });
}

function injectSystemModules(openDbPanel) {
  if (document.getElementById("module-system-tools")) return;
  const headings = [...document.querySelectorAll("h3, h4, div, span")];
  const serviceHeading = headings.find((el) => (el.textContent || "").trim().toLowerCase() === "service");
  const moduleContainer = serviceHeading?.parentElement || [...document.querySelectorAll("aside, nav, section, div")].find((el) => /MODULE/i.test(el.textContent || "") && /Hilfe/i.test(el.textContent || ""));
  if (!moduleContainer) return;

  const wrap = document.createElement("div");
  wrap.id = "module-system-tools";
  wrap.style.marginTop = "18px";
  wrap.innerHTML = `<div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin:0 0 8px 0;">System</div>`;

  systemTools.forEach((tool) => {
    const button = document.createElement(tool.href ? "a" : "button");
    if (tool.href) {
      button.href = tool.href;
      button.target = "_blank";
      button.rel = "noreferrer";
    }
    if (tool.action === "db-panel") button.addEventListener("click", openDbPanel);
    button.style.display = "block";
    button.style.width = "100%";
    button.style.boxSizing = "border-box";
    button.style.textAlign = "left";
    button.style.border = "0";
    button.style.borderRadius = "14px";
    button.style.background = "transparent";
    button.style.color = "#334155";
    button.style.padding = "10px 12px";
    button.style.marginBottom = "4px";
    button.style.cursor = "pointer";
    button.style.textDecoration = "none";
    button.innerHTML = `<div style="font-weight:950;color:#334155">${tool.title}</div><div style="font-size:12px;line-height:1.35;color:#94a3b8;margin-top:3px">${tool.desc}</div>`;
    wrap.appendChild(button);
  });
  moduleContainer.appendChild(wrap);
}

function createDbPanel() {
  const old = document.getElementById("clean-db-panel");
  if (old) old.remove();
  const panel = document.createElement("div");
  panel.id = "clean-db-panel";
  panel.style.position = "fixed";
  panel.style.right = "24px";
  panel.style.top = "24px";
  panel.style.bottom = "24px";
  panel.style.width = "min(880px, calc(100vw - 48px))";
  panel.style.zIndex = "160";
  panel.style.overflow = "auto";
  panel.style.background = "#fff";
  panel.style.color = "#0f172a";
  panel.style.border = "1px solid #dbe3ee";
  panel.style.borderRadius = "24px";
  panel.style.boxShadow = "0 24px 80px rgba(15,23,42,.28)";
  panel.style.padding = "18px";
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h2 style="margin:0;font-size:24px">Datenbank-Szenarien</h2><p style="margin:6px 0 0;color:#475569">DB-Bestand lesen und lokale Kopien kontrolliert aktualisieren.</p></div><button id="clean-db-close" style="border:1px solid #cbd5e1;border-radius:12px;background:white;padding:8px 10px;font-weight:900;cursor:pointer">Schließen</button></div><div id="clean-db-content" style="margin-top:16px;color:#475569">Lade Datenbankbestand...</div>`;
  document.body.appendChild(panel);
  panel.querySelector("#clean-db-close").onclick = () => panel.remove();
  return panel;
}

async function openDbPanel(e) {
  e?.preventDefault?.();
  const panel = createDbPanel();
  const content = panel.querySelector("#clean-db-content");
  try {
    const [health, scenarios] = await Promise.all([
      fetch("/api/health", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/db/scenarios", { cache: "no-store" }).then((r) => r.json())
    ]);
    const items = scenarios.items || [];
    content.innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
        ${pill(`Speicher: ${health.storageMode || "local"}`, "ok")}
        ${pill(`DB-Szenarien: ${items.length}`)}
      </div>
      <div style="display:grid;gap:10px">
        ${items.map((s) => `<div style="border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;padding:14px"><div style="font-weight:950;color:#0f172a">${esc(s.title || s.name || s.id)}</div><div style="font-size:13px;color:#64748b;margin-top:4px">${esc(s.description || "")}</div><div style="margin-top:8px">${pill(`Projekte: ${s.project_count ?? 0}`)} ${pill(`Versionen: ${s.version_count ?? 0}`)}</div></div>`).join("") || "<p>Keine DB-Szenarien gefunden.</p>"}
      </div>
      <p style="margin-top:16px"><a href="/db-viewer.html" target="_blank" rel="noreferrer" style="font-weight:900;color:#0f172a">Erweiterte DB-Prüfung öffnen</a></p>
    `;
  } catch (err) {
    content.innerHTML = `<div style="border:1px solid #fecdd3;background:#fff1f2;color:#9f1239;border-radius:16px;padding:12px;font-weight:800">${esc(err.message || err)}</div>`;
  }
}

export default function App27() {
  useEffect(() => {
    const run = () => {
      removeBuildLabels();
      reduceHero();
      hideRedundantCompareEntrypoints();
      markComparePlusAsCentral();
      injectSystemModules(openDbPanel);
    };
    run();
    const timer = setInterval(run, 700);
    return () => clearInterval(timer);
  }, []);

  return <App19 />;
}
