import React, { useEffect } from "react";
import App19 from "./App19.jsx";

const STORAGE_KEY = "ki-kernel-szenarien-v8";

const tools = [
  { title: "Vergleich", desc: "Gespeicherte Szenarien als Entscheidungshilfe vergleichen.", action: "compare-panel" },
  { title: "Datenbank", desc: "DB-Szenarien lesen und lokale Kopien kontrolliert aktualisieren.", action: "db-panel" },
  { title: "Projektakte", desc: "Projektansicht, Szenariozuordnung und Dossier.", href: "/projekte.html" },
  { title: "Backup", desc: "Export, Import und Datenmodellprüfung.", href: "/backup.html" },
  { title: "DB-Prüfung", desc: "Datenbankbestand, Zuordnungen und Audit-Log prüfen.", href: "/db-viewer.html" },
  { title: "DB-Setup", desc: "Datenbankschema und Backup-Import verwalten.", href: "/db-setup.html" }
];

function esc(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c]));
}
function readSaved() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function unwrapScenario(item) {
  return item?.state || item?.scenario || item || {};
}
function titleOf(item) {
  const s = unwrapScenario(item);
  return item?.name || s?.context?.title || s?.title || "Unbenanntes Szenario";
}
function arr(x) { return Array.isArray(x) ? x : []; }
function num(x, fallback = 0) { const n = Number(x); return Number.isFinite(n) ? n : fallback; }
function avg(list, selector) { const values = list.map(selector).filter((x) => Number.isFinite(x)); return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }
function resourceScore(r) { const current = num(r.current, 3); return r.direction === "low_good" ? (6 - current) * 20 : current * 20; }
function strategyScore(st) { return num(st.acceptance, 3) * 3 + num(st.control, 3) * 3 + num(st.innovation, 3) * 2 + num(st.speed, 3) - num(st.risk, 3) * 3; }
function scoreScenario(item) {
  const s = unwrapScenario(item);
  const personas = arr(s.personas);
  const resources = arr(s.resources);
  const assumptions = arr(s.assumptions);
  const interventions = arr(s.interventions);
  const strategies = arr(s.strategies);
  const resScore = resources.length ? avg(resources, resourceScore) : 60;
  const riskyAssumptions = assumptions.filter((a) => /niedrig/i.test(a.evidence || "") || /hoch/i.test(a.uncertainty || ""));
  const hasGovernance = interventions.some((x) => /daten|datenschutz|dokumentation|governance|checkliste|mav|freigabe/i.test(`${x.name || ""} ${x.target || ""} ${x.benefit || ""}`));
  const hasParticipation = interventions.some((x) => /beteilig|reflexion|jour fixe|rollenklärung|workshop|interview|steelman|moderation/i.test(`${x.name || ""} ${x.target || ""} ${x.benefit || ""}`));
  const acceptance = Math.round(Math.min(100, 20 + avg(personas, (p) => num(p.trust, 3)) * 8 + avg(personas, (p) => num(p.changeEnergy, 3)) * 4 + (hasParticipation ? 16 : 0) + resScore * 0.15 - riskyAssumptions.length * 4));
  const governance = Math.round(Math.min(100, 30 + avg(personas, (p) => num(p.riskSense, 3)) * 5 + (hasGovernance ? 22 : 0) + resScore * 0.18));
  const learning = Math.round(Math.min(100, 25 + avg(personas, (p) => num(p.aiLiteracy, 3)) * 7 + avg(personas, (p) => num(p.changeEnergy, 3)) * 5 + interventions.length * 5));
  const risk = Math.round(Math.max(0, 100 - (acceptance * 0.35 + governance * 0.4 + learning * 0.15 + resScore * 0.1)));
  const bestStrategy = [...strategies].sort((a, b) => strategyScore(b) - strategyScore(a))[0] || null;
  const bottlenecks = resources.filter((r) => {
    const current = num(r.current, 3);
    const target = num(r.target, 4);
    return r.direction === "low_good" ? current > target : target > current;
  });
  return { acceptance, governance, learning, resources: Math.round(resScore), risk, riskyAssumptions, bestStrategy, bottlenecks, counts: { assumptions: assumptions.length, personas: personas.length, resources: resources.length, interventions: interventions.length, strategies: strategies.length } };
}
function compareSelected(items) {
  const scored = items.map((item) => ({ item, scenario: unwrapScenario(item), title: titleOf(item), score: scoreScenario(item) }));
  const ranked = [...scored].sort((a, b) => ((b.score.acceptance + b.score.governance + b.score.learning + b.score.resources - b.score.risk) - (a.score.acceptance + a.score.governance + a.score.learning + a.score.resources - a.score.risk)));
  const recommendation = ranked[0] || null;
  const dimensions = ["acceptance", "governance", "learning", "resources", "risk"];
  const spreads = dimensions.map((d) => {
    const values = scored.map((x) => x.score[d]);
    return { dimension: d, min: Math.min(...values), max: Math.max(...values), spread: Math.max(...values) - Math.min(...values) };
  }).sort((a, b) => b.spread - a.spread);
  return { scored, ranked, recommendation, spreads };
}
function metricLabel(k) {
  return { acceptance: "Akzeptanz", governance: "Governance", learning: "Lernen", resources: "Ressourcen", risk: "Risiko" }[k] || k;
}
function toneForMetric(metric, value) {
  if (metric === "risk") return value >= 55 ? "warn" : "ok";
  return value >= 70 ? "ok" : value >= 50 ? "info" : "warn";
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
function buildReport(cmp) {
  if (!cmp.scored.length) return "";
  const rec = cmp.recommendation;
  const lines = [];
  lines.push("Beratungsfähiger Szenariovergleich");
  lines.push("");
  lines.push("Verglichene Szenarien:");
  cmp.scored.forEach((x, i) => lines.push(`${i + 1}. ${x.title}`));
  lines.push("");
  if (rec) {
    lines.push(`Vorläufige Empfehlung: ${rec.title}`);
    lines.push(`Begründung: Dieses Szenario zeigt im heuristischen Vergleich die stärkste Kombination aus Akzeptanz, Governance, Lernfähigkeit und Ressourcenlage bei begrenztem Risiko.`);
  }
  lines.push("");
  lines.push("Zielkonflikte:");
  cmp.spreads.slice(0, 3).forEach((s) => lines.push(`- ${metricLabel(s.dimension)} unterscheidet sich um ${s.spread} Punkte.`));
  lines.push("");
  lines.push("Kritische Annahmen und Engpässe:");
  cmp.scored.forEach((x) => {
    lines.push(`- ${x.title}: ${x.score.riskyAssumptions.length} riskante Annahmen, ${x.score.bottlenecks.length} Ressourcenengpässe.`);
  });
  lines.push("");
  lines.push("Hinweis: Der Vergleich ist eine Entscheidungshilfe, keine automatische Entscheidung. Die Empfehlung hängt von Zielprioritäten, Kontextwissen und fachlicher Prüfung ab.");
  return lines.join("\n");
}

function removeBuildLabels() {
  const patterns = [/KI-Kernel GPT\s*\d+(\.\d+)*/i, /Backup\s*\d+(\.\d+)*/i, /DB-Viewer\s*\d+(\.\d+)*/i, /DB-Setup\s*\d+(\.\d+)*/i, /Projektakte\s*\d+(\.\d+)*/i];
  document.querySelectorAll("body *").forEach((el) => {
    if (!el || el.dataset?.cleanedVersionLabel === "true") return;
    const text = (el.textContent || "").trim();
    if (!text || text.length > 80) return;
    if (patterns.some((p) => p.test(text))) {
      el.dataset.cleanedVersionLabel = "true";
      el.style.display = "none";
    }
  });
}
function reduceHero() {
  const headings = [...document.querySelectorAll("h1")];
  headings.forEach((h) => {
    const text = h.textContent || "";
    if (/Beratungsfähiger Organisationssimulator/i.test(text)) {
      h.style.fontSize = "clamp(32px, 4vw, 56px)";
      h.style.lineHeight = "1.02";
      h.style.marginTop = "10px";
      h.style.marginBottom = "8px";
      const section = h.closest("section, header, div");
      if (section) {
        section.style.paddingTop = "44px";
        section.style.paddingBottom = "34px";
      }
    }
  });
}
function injectSystemModules(openDbPanel, openComparePanel) {
  if (document.getElementById("module-system-tools")) return;
  const headings = [...document.querySelectorAll("h3, h4, div, span")];
  const serviceHeading = headings.find((el) => (el.textContent || "").trim().toLowerCase() === "service");
  const moduleContainer = serviceHeading?.parentElement || [...document.querySelectorAll("aside, nav, section, div")].find((el) => /MODULE/i.test(el.textContent || "") && /Hilfe/i.test(el.textContent || ""));
  if (!moduleContainer) return;
  const wrap = document.createElement("div");
  wrap.id = "module-system-tools";
  wrap.style.marginTop = "18px";
  wrap.innerHTML = `<div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin:0 0 8px 0;">System</div>`;
  tools.forEach((tool) => {
    const button = document.createElement(tool.href ? "a" : "button");
    if (tool.href) { button.href = tool.href; button.target = "_blank"; button.rel = "noreferrer"; }
    if (tool.action === "db-panel") button.addEventListener("click", openDbPanel);
    if (tool.action === "compare-panel") button.addEventListener("click", openComparePanel);
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
function createPanel(id, title, subtitle) {
  const old = document.getElementById(id);
  if (old) old.remove();
  const panel = document.createElement("div");
  panel.id = id;
  panel.style.position = "fixed";
  panel.style.right = "24px";
  panel.style.top = "24px";
  panel.style.bottom = "24px";
  panel.style.width = "min(980px, calc(100vw - 48px))";
  panel.style.zIndex = "160";
  panel.style.overflow = "auto";
  panel.style.background = "#fff";
  panel.style.color = "#0f172a";
  panel.style.border = "1px solid #dbe3ee";
  panel.style.borderRadius = "24px";
  panel.style.boxShadow = "0 24px 80px rgba(15,23,42,.28)";
  panel.style.padding = "18px";
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h2 style="margin:0;font-size:24px">${esc(title)}</h2><p style="margin:6px 0 0;color:#475569">${esc(subtitle)}</p></div><button data-close style="border:1px solid #cbd5e1;border-radius:12px;background:white;padding:8px 10px;font-weight:900;cursor:pointer">Schließen</button></div><div data-content style="margin-top:16px;color:#475569">Lade...</div>`;
  document.body.appendChild(panel);
  panel.querySelector("[data-close]").onclick = () => panel.remove();
  return panel;
}
async function openDbPanel(e) {
  e?.preventDefault?.();
  const panel = createPanel("clean-db-panel", "Datenbank-Szenarien", "DB-Bestand lesen und lokale Kopien kontrolliert aktualisieren.");
  const content = panel.querySelector("[data-content]");
  try {
    const [health, scenarios] = await Promise.all([
      fetch("/api/health", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/db/scenarios", { cache: "no-store" }).then((r) => r.json())
    ]);
    const items = scenarios.items || [];
    content.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">${pill(`Speicher: ${health.storageMode || "local"}`, "ok")}${pill(`DB-Szenarien: ${items.length}`)}</div><div style="display:grid;gap:10px">${items.map((s) => `<div style="border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;padding:14px"><div style="font-weight:950;color:#0f172a">${esc(s.title || s.name || s.id)}</div><div style="font-size:13px;color:#64748b;margin-top:4px">${esc(s.description || "")}</div><div style="margin-top:8px">${pill(`Projekte: ${s.project_count ?? 0}`)} ${pill(`Versionen: ${s.version_count ?? 0}`)}</div></div>`).join("") || "<p>Keine DB-Szenarien gefunden.</p>"}</div><p style="margin-top:16px"><a href="/db-viewer.html" target="_blank" rel="noreferrer" style="font-weight:900;color:#0f172a">Erweiterte DB-Prüfung öffnen</a></p>`;
  } catch (err) {
    content.innerHTML = `<div style="border:1px solid #fecdd3;background:#fff1f2;color:#9f1239;border-radius:16px;padding:12px;font-weight:800">${esc(err.message || err)}</div>`;
  }
}
function openComparePanel(e) {
  e?.preventDefault?.();
  const saved = readSaved();
  const panel = createPanel("consulting-compare-panel", "Beratungsfähiger Szenariovergleich", "Gespeicherte Szenarien als Entscheidungshilfe vergleichen.");
  const content = panel.querySelector("[data-content]");
  if (saved.length < 2) {
    content.innerHTML = `<div style="border:1px solid #fde68a;background:#fffbeb;color:#92400e;border-radius:16px;padding:12px;font-weight:800">Für den Vergleich werden mindestens zwei gespeicherte Szenarien benötigt.</div>`;
    return;
  }
  const options = saved.map((item, i) => `<option value="${i}">${esc(titleOf(item))}</option>`).join("");
  content.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:14px">
      <label style="font-weight:900;color:#334155">Szenario A<select id="cmp-a" style="display:block;width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:12px;padding:10px">${options}</select></label>
      <label style="font-weight:900;color:#334155">Szenario B<select id="cmp-b" style="display:block;width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:12px;padding:10px">${options}</select></label>
      <label style="font-weight:900;color:#334155">Szenario C optional<select id="cmp-c" style="display:block;width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:12px;padding:10px"><option value="">nicht vergleichen</option>${options}</select></label>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><button id="cmp-run" style="border:1px solid #020617;border-radius:14px;background:#020617;color:white;padding:10px 12px;font-weight:900;cursor:pointer">Vergleich erstellen</button><button id="cmp-copy" style="border:1px solid #cbd5e1;border-radius:14px;background:white;color:#0f172a;padding:10px 12px;font-weight:900;cursor:pointer">Report kopieren</button></div>
    <div id="cmp-result"></div>`;
  const a = content.querySelector("#cmp-a");
  const b = content.querySelector("#cmp-b");
  const c = content.querySelector("#cmp-c");
  if (saved.length > 1) b.value = "1";
  let lastReport = "";
  function run() {
    const ids = [a.value, b.value, c.value].filter((v) => v !== "");
    const unique = [...new Set(ids)].map((idx) => saved[Number(idx)]).filter(Boolean);
    if (unique.length < 2) {
      content.querySelector("#cmp-result").innerHTML = `<div style="border:1px solid #fde68a;background:#fffbeb;color:#92400e;border-radius:16px;padding:12px;font-weight:800">Bitte mindestens zwei verschiedene Szenarien auswählen.</div>`;
      return;
    }
    const cmp = compareSelected(unique);
    lastReport = buildReport(cmp);
    const rows = cmp.scored.map((x) => `<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0"><b>${esc(x.title)}</b><br><span style="font-size:12px;color:#64748b">${esc(x.scenario?.context?.domain || "")}</span></td>${["acceptance","governance","learning","resources","risk"].map((m) => `<td style="padding:10px;border-bottom:1px solid #e2e8f0">${pill(String(x.score[m]), toneForMetric(m, x.score[m]))}</td>`).join("")}<td style="padding:10px;border-bottom:1px solid #e2e8f0">${esc(x.score.bestStrategy?.name || "—")}</td></tr>`).join("");
    const conflictHtml = cmp.spreads.slice(0, 3).map((s) => `<li><b>${metricLabel(s.dimension)}</b>: Spreizung ${s.spread} Punkte. Das ist ein entscheidungsrelevanter Zielkonflikt.</li>`).join("");
    const criticalHtml = cmp.scored.map((x) => `<div style="border:1px solid #e2e8f0;border-radius:14px;padding:12px;background:#f8fafc"><b>${esc(x.title)}</b><br>${pill(`${x.score.riskyAssumptions.length} riskante Annahmen`, x.score.riskyAssumptions.length ? "warn" : "ok")} ${pill(`${x.score.bottlenecks.length} Engpässe`, x.score.bottlenecks.length ? "warn" : "ok")} ${pill(`${x.score.counts.interventions} Interventionen`)}</div>`).join("");
    content.querySelector("#cmp-result").innerHTML = `
      <div style="border:1px solid #bbf7d0;background:#ecfdf5;color:#065f46;border-radius:16px;padding:14px;margin-bottom:14px"><b>Vorläufige Empfehlung:</b> ${esc(cmp.recommendation?.title || "—")}<br><span style="color:#166534">Stärkste Gesamtkombination aus Akzeptanz, Governance, Lernfähigkeit, Ressourcenlage und Risiko.</span></div>
      <div style="overflow:auto;border:1px solid #e2e8f0;border-radius:16px;margin-bottom:14px"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th style="text-align:left;padding:10px;background:#f8fafc">Szenario</th>${["acceptance","governance","learning","resources","risk"].map((m) => `<th style="text-align:left;padding:10px;background:#f8fafc">${metricLabel(m)}</th>`).join("")}<th style="text-align:left;padding:10px;background:#f8fafc">stärkste Strategie</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px"><section style="border:1px solid #e2e8f0;border-radius:16px;padding:14px"><h3 style="margin-top:0">Zielkonflikte</h3><ul>${conflictHtml}</ul></section><section style="border:1px solid #e2e8f0;border-radius:16px;padding:14px"><h3 style="margin-top:0">Kritische Punkte</h3><div style="display:grid;gap:8px">${criticalHtml}</div></section></div>
      <section style="border:1px solid #e2e8f0;border-radius:16px;padding:14px;margin-top:14px"><h3 style="margin-top:0">Vergleichsreport</h3><pre style="white-space:pre-wrap;background:#0f172a;color:#e2e8f0;border-radius:14px;padding:14px;max-height:360px;overflow:auto">${esc(lastReport)}</pre></section>`;
  }
  content.querySelector("#cmp-run").onclick = run;
  content.querySelector("#cmp-copy").onclick = () => navigator.clipboard?.writeText(lastReport || "");
  run();
}

export default function App26() {
  useEffect(() => {
    const run = () => { removeBuildLabels(); reduceHero(); injectSystemModules(openDbPanel, openComparePanel); };
    run();
    const timer = setInterval(run, 800);
    return () => clearInterval(timer);
  }, []);
  return <App19 />;
}
