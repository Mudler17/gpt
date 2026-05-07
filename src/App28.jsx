import React, { useEffect } from "react";
import App27 from "./App27.jsx";

const STORAGE_KEY = "ki-kernel-szenarien-v8";

function esc(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c]));
}
function arr(x) { return Array.isArray(x) ? x : []; }
function num(x, fallback = 0) { const n = Number(x); return Number.isFinite(n) ? n : fallback; }
function avg(list, selector) { const values = list.map(selector).filter(Number.isFinite); return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0; }
function readSaved() { try { const x = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(x) ? x : []; } catch { return []; } }
function stateOf(item) { return item?.state || item?.scenario || item || {}; }
function titleOf(item) { const s = stateOf(item); return item?.name || s?.context?.title || s?.title || "Unbenanntes Szenario"; }
function cleanTitle(t) { return String(t || "").replace(/· DB-Restore Kopie/gi, "").replace(/· DB-Restore/gi, "").replace(/^Import\+\s*·\s*/i, "").trim(); }
function resourceScore(r) { const current = num(r.current, 3); return r.direction === "low_good" ? (6-current)*20 : current*20; }
function resourceGap(r) { return r.direction === "low_good" ? num(r.current, 3) - num(r.target, 4) : num(r.target, 4) - num(r.current, 3); }
function strategyScore(s) { return num(s.acceptance,3)*3 + num(s.control,3)*3 + num(s.innovation,3)*2 + num(s.speed,3) - num(s.risk,3)*3; }
function scoreScenario(item) {
  const s = stateOf(item);
  const personas = arr(s.personas), resources = arr(s.resources), assumptions = arr(s.assumptions), interventions = arr(s.interventions), strategies = arr(s.strategies);
  const res = resources.length ? avg(resources, resourceScore) : 60;
  const risky = assumptions.filter((a) => /niedrig/i.test(a.evidence || "") || /hoch/i.test(a.uncertainty || ""));
  const hasGov = interventions.some((i) => /daten|datenschutz|dokumentation|governance|checkliste|mav|freigabe/i.test(`${i.name || ""} ${i.target || ""} ${i.benefit || ""}`));
  const hasPart = interventions.some((i) => /beteilig|reflexion|jour fixe|rollenklärung|workshop|interview|steelman|moderation/i.test(`${i.name || ""} ${i.target || ""} ${i.benefit || ""}`));
  const acceptance = Math.round(Math.min(100, 20 + avg(personas, (p)=>num(p.trust,3))*8 + avg(personas, (p)=>num(p.aiLiteracy,3))*3 + avg(personas, (p)=>num(p.changeEnergy,3))*4 + (hasPart?16:0) + res*0.15 - risky.length*4));
  const governance = Math.round(Math.min(100, 30 + avg(personas, (p)=>num(p.riskSense,3))*5 + (hasGov?22:0) + res*0.18));
  const learning = Math.round(Math.min(100, 25 + avg(personas, (p)=>num(p.aiLiteracy,3))*7 + avg(personas, (p)=>num(p.changeEnergy,3))*5 + interventions.length*5));
  const risk = Math.round(Math.max(0, 100 - (acceptance*0.35 + governance*0.4 + learning*0.15 + res*0.1)));
  const bestStrategy = [...strategies].sort((a,b)=>strategyScore(b)-strategyScore(a))[0] || null;
  const deficits = resources.filter((r)=>resourceGap(r)>0);
  const total = Math.round(acceptance + governance + learning + res - risk);
  return { acceptance, governance, learning, resources: Math.round(res), risk, total, risky, deficits, bestStrategy, counts: { assumptions: assumptions.length, personas: personas.length, resources: resources.length, interventions: interventions.length, strategies: strategies.length } };
}
function metricLabel(k) { return { acceptance:"Akzeptanz", governance:"Governance", learning:"Lernfähigkeit", resources:"Ressourcen", risk:"Restrisiko" }[k] || k; }
function tone(metric, value) { if (metric === "risk") return value >= 55 ? "warn" : value >= 35 ? "info" : "ok"; return value >= 75 ? "ok" : value >= 55 ? "info" : "warn"; }
function color(t) { return t === "ok" ? ["#ecfdf5", "#bbf7d0", "#065f46"] : t === "warn" ? ["#fffbeb", "#fde68a", "#92400e"] : t === "bad" ? ["#fff1f2", "#fecdd3", "#9f1239"] : ["#eff6ff", "#bfdbfe", "#1e40af"]; }
function pill(text, t="info") { const [bg,b,c]=color(t); return `<span style="display:inline-flex;border:1px solid ${b};background:${bg};color:${c};border-radius:999px;padding:4px 9px;font-size:12px;font-weight:850">${esc(text)}</span>`; }
function bar(value, metric) { const t = tone(metric, value); const [, , c] = color(t); return `<div style="height:9px;background:#e2e8f0;border-radius:999px;overflow:hidden"><div style="height:100%;width:${Math.max(0, Math.min(100, value))}%;background:${c};border-radius:999px"></div></div>`; }
function compare(items) {
  const scored = items.map((item)=>({ item, title:titleOf(item), clean:cleanTitle(titleOf(item)), state:stateOf(item), score:scoreScenario(item) }));
  const ranked = [...scored].sort((a,b)=>b.score.total-a.score.total);
  const metrics = ["acceptance", "governance", "learning", "resources", "risk"];
  const spreads = metrics.map((m)=>{ const vals=scored.map((x)=>x.score[m]); return { metric:m, spread:Math.max(...vals)-Math.min(...vals), min:Math.min(...vals), max:Math.max(...vals) }; }).sort((a,b)=>b.spread-a.spread);
  const maxSpread = spreads[0]?.spread || 0;
  const sameClean = new Set(scored.map((x)=>x.clean.toLowerCase())).size === 1;
  const nearlyIdentical = maxSpread <= 3;
  const onlyOrigin = nearlyIdentical && sameClean;
  const sharedStrategies = new Set(scored.map((x)=>x.score.bestStrategy?.name || "—"));
  const deficitNames = scored.map((x)=>new Set(x.score.deficits.map((d)=>d.name))).reduce((acc,set,i)=> i===0 ? set : new Set([...acc].filter((v)=>set.has(v))), new Set());
  return { scored, ranked, spreads, maxSpread, nearlyIdentical, onlyOrigin, sharedStrategies, sharedDeficits:[...deficitNames] };
}
function report(cmp) {
  const lines = [];
  lines.push("Vergleich+ Dashboard-Bericht");
  lines.push("");
  if (cmp.onlyOrigin) lines.push("Kurzbefund: Die ausgewählten Szenarien sind inhaltlich nahezu identisch. Der Unterschied betrifft vorrangig Herkunft, Speicherstatus oder lokale Variante.");
  else if (cmp.nearlyIdentical) lines.push("Kurzbefund: Die ausgewählten Szenarien unterscheiden sich nur geringfügig. Ein strategischer Vergleich erzeugt aktuell wenig zusätzliche Entscheidungsschärfe.");
  else lines.push(`Kurzbefund: Größte Spreizung: ${metricLabel(cmp.spreads[0].metric)} (${cmp.spreads[0].spread} Punkte).`);
  lines.push("");
  lines.push(`Vorläufige Empfehlung: ${cmp.ranked[0]?.title || "—"}`);
  lines.push("");
  lines.push("Kennzahlen:");
  cmp.scored.forEach((x)=>lines.push(`- ${x.title}: Akzeptanz ${x.score.acceptance}, Governance ${x.score.governance}, Ressourcen ${x.score.resources}, Lernfähigkeit ${x.score.learning}, Restrisiko ${x.score.risk}`));
  lines.push("");
  lines.push("Zielkonflikte:");
  cmp.spreads.slice(0,3).forEach((s)=>lines.push(`- ${metricLabel(s.metric)}: ${s.spread} Punkte Spreizung.`));
  lines.push("");
  lines.push("Nächster Schritt:");
  lines.push(cmp.onlyOrigin ? "- Varianten bereinigen oder eine Fassung als Leitszenario festlegen." : "- Höchste Zielkonflikte fachlich prüfen und Entscheidungskriterien gewichten.");
  return lines.join("\n");
}

function renderDashboard(root) {
  const saved = readSaved();
  if (!saved.length) {
    root.innerHTML = `<div style="border:1px solid #fde68a;background:#fffbeb;color:#92400e;border-radius:16px;padding:14px;font-weight:800">Keine gespeicherten Szenarien gefunden.</div>`;
    return;
  }
  const options = saved.map((s,i)=>`<option value="${i}">${esc(titleOf(s))}</option>`).join("");
  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px">
      <div><h2 style="margin:0;font-size:24px;font-weight:950;color:#020617">Vergleich+</h2><p style="margin:6px 0 0;color:#475569;font-size:14px">Zentraler Szenariovergleich als Beratungs-Dashboard.</p></div>
      <button id="cmp-reload" style="border:1px solid #020617;border-radius:14px;background:#020617;color:white;padding:10px 14px;font-weight:900;cursor:pointer">Speicher neu laden</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:14px">
      <label style="font-weight:900;color:#334155;font-size:14px">Szenario A<select id="cmp-a" style="display:block;width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:14px;padding:10px;background:white">${options}</select></label>
      <label style="font-weight:900;color:#334155;font-size:14px">Szenario B<select id="cmp-b" style="display:block;width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:14px;padding:10px;background:white">${options}</select></label>
      <label style="font-weight:900;color:#334155;font-size:14px">Szenario C optional<select id="cmp-c" style="display:block;width:100%;margin-top:6px;border:1px solid #cbd5e1;border-radius:14px;padding:10px;background:white"><option value="">— auswählen —</option>${options}</select></label>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><button id="cmp-copy" style="border:1px solid #cbd5e1;border-radius:14px;background:white;color:#0f172a;padding:10px 14px;font-weight:900;cursor:pointer">Bericht kopieren</button><button id="cmp-txt" style="border:1px solid #cbd5e1;border-radius:14px;background:white;color:#0f172a;padding:10px 14px;font-weight:900;cursor:pointer">TXT</button></div>
    <div id="cmp-out"></div>`;
  const a = root.querySelector("#cmp-a"), b = root.querySelector("#cmp-b"), c = root.querySelector("#cmp-c"), out = root.querySelector("#cmp-out");
  if (saved.length > 1) b.value = "1";
  let currentReport = "";
  function run() {
    const idx = [a.value,b.value,c.value].filter((v)=>v!=="");
    const unique = [...new Set(idx)].map((i)=>saved[Number(i)]).filter(Boolean);
    if (unique.length < 2) { out.innerHTML = `<div style="border:1px solid #fde68a;background:#fffbeb;color:#92400e;border-radius:16px;padding:14px;font-weight:800">Bitte mindestens zwei verschiedene Szenarien auswählen.</div>`; return; }
    const cmp = compare(unique); currentReport = report(cmp);
    const summaryText = cmp.onlyOrigin ? "Inhaltlich nahezu identisch · Unterschied vor allem Herkunft/Version" : cmp.nearlyIdentical ? "Inhaltlich sehr ähnlich · wenig entscheidungsrelevante Differenz" : `Entscheidungsrelevante Differenz bei ${metricLabel(cmp.spreads[0].metric)}`;
    const recommendation = cmp.onlyOrigin ? "Varianten bereinigen oder eine Fassung als Leitszenario festlegen." : `Vorläufig stärkste Option: ${cmp.ranked[0]?.title || "—"}`;
    const kpis = [["Ähnlichkeit", cmp.nearlyIdentical ? "hoch" : cmp.maxSpread <= 12 ? "mittel" : "niedrig", cmp.nearlyIdentical ? "ok" : cmp.maxSpread <= 12 ? "info" : "warn"],["Größter Unterschied", `${metricLabel(cmp.spreads[0].metric)} · ${cmp.spreads[0].spread}`, cmp.spreads[0].spread > 15 ? "warn" : "info"],["Robustere Option", cmp.ranked[0]?.title || "—", "ok"],["Nächster Schritt", cmp.onlyOrigin ? "bereinigen" : "prüfen", cmp.onlyOrigin ? "warn" : "info"]];
    const metricRows = ["acceptance","governance","resources","learning","risk"].map((m)=>`<div style="border:1px solid #e2e8f0;border-radius:16px;padding:12px;background:white"><div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:8px"><b>${metricLabel(m)}</b><span style="color:#64748b;font-size:13px">Differenz ${cmp.spreads.find((s)=>s.metric===m)?.spread ?? 0}</span></div>${cmp.scored.map((x)=>`<div style="display:grid;grid-template-columns:minmax(130px,220px) 1fr 44px;gap:10px;align-items:center;margin:7px 0"><div style="font-size:13px;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.title)}</div>${bar(x.score[m], m)}<b style="font-size:13px;text-align:right">${x.score[m]}</b></div>`).join("")}</div>`).join("");
    const common = [];
    if (cmp.sharedStrategies.size === 1) common.push(`gleiche stärkste Strategie: ${[...cmp.sharedStrategies][0]}`);
    if (cmp.sharedDeficits.length) common.push(`gemeinsame Engpässe: ${cmp.sharedDeficits.join(", ")}`);
    if (cmp.nearlyIdentical) common.push("sehr ähnliche Kennzahlenlage");
    const diffs = cmp.onlyOrigin ? ["Unterschied betrifft primär Herkunft, Kopie oder Speicherstatus."] : cmp.spreads.filter((s)=>s.spread>3).slice(0,4).map((s)=>`${metricLabel(s.metric)}: ${s.spread} Punkte Spreizung`);
    out.innerHTML = `<section style="border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:20px;padding:16px;margin-bottom:14px"><div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#1d4ed8">Management Summary</div><h3 style="margin:6px 0 6px;font-size:22px;color:#0f172a">${esc(summaryText)}</h3><p style="margin:0;color:#334155">${esc(recommendation)}</p></section><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px">${kpis.map(([k,v,t])=>{ const [bg,b,c]=color(t); return `<div style="border:1px solid ${b};background:${bg};color:${c};border-radius:18px;padding:14px"><div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em">${esc(k)}</div><div style="margin-top:6px;font-size:18px;font-weight:950;color:#0f172a">${esc(v)}</div></div>`; }).join("")}</div><section style="display:grid;gap:10px;margin-bottom:14px">${metricRows}</section><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:14px"><section style="border:1px solid #e2e8f0;border-radius:18px;padding:14px;background:#fff"><h3 style="margin:0 0 8px;color:#0f172a">Gemeinsamkeiten</h3><ul style="margin:0;padding-left:20px;color:#334155">${(common.length?common:["keine auffälligen Gemeinsamkeiten automatisch erkannt"]).map((x)=>`<li>${esc(x)}</li>`).join("")}</ul></section><section style="border:1px solid #e2e8f0;border-radius:18px;padding:14px;background:#fff"><h3 style="margin:0 0 8px;color:#0f172a">Entscheidungsrelevante Unterschiede</h3><ul style="margin:0;padding-left:20px;color:#334155">${(diffs.length?diffs:["keine relevanten Unterschiede erkannt"]).map((x)=>`<li>${esc(x)}</li>`).join("")}</ul></section></div><section style="border:1px solid #e2e8f0;border-radius:18px;padding:14px;background:#fff"><h3 style="margin:0 0 8px;color:#0f172a">Kritische Punkte</h3><div style="display:grid;gap:8px">${cmp.scored.map((x)=>`<div style="border:1px solid #e2e8f0;border-radius:14px;padding:12px;background:#f8fafc"><b>${esc(x.title)}</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${pill(`${x.score.risky.length} riskante Annahmen`, x.score.risky.length?"warn":"ok")} ${pill(`${x.score.deficits.length} Engpässe`, x.score.deficits.length?"warn":"ok")} ${pill(`${x.score.counts.interventions} Interventionen`)}</div></div>`).join("")}</div></section>`;
  }
  a.onchange = run; b.onchange = run; c.onchange = run;
  root.querySelector("#cmp-reload").onclick = () => integrateCompareDashboard(true);
  root.querySelector("#cmp-copy").onclick = () => navigator.clipboard?.writeText(currentReport || "");
  root.querySelector("#cmp-txt").onclick = () => { const blob = new Blob([currentReport || ""], {type:"text/plain;charset=utf-8"}); const link=document.createElement("a"); link.href=URL.createObjectURL(blob); link.download="vergleich-plus-dashboard.txt"; link.click(); URL.revokeObjectURL(link.href); };
  run();
}

function isVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}
function findCompareSection() {
  const candidates = [...document.querySelectorAll("section, div")].filter((el)=>{
    if (!isVisible(el)) return false;
    if (el.closest("#clean-db-panel,#consulting-compare-panel")) return false;
    const txt = (el.textContent || "").trim();
    if (!txt.startsWith("Vergleich+") || !txt.includes("Szenario A") || !txt.includes("Szenario B")) return false;
    if (txt.includes("Phasen-Set") || txt.includes("Verlaufssimulation") || txt.includes("Ressourcenverlauf")) return false;
    return true;
  });
  return candidates.sort((a,b)=>a.textContent.length-b.textContent.length)[0] || null;
}
function integrateCompareDashboard(force=false) {
  const section = findCompareSection();
  if (!section) return;
  if (section.dataset.dashboardCompare === "true" && !force) return;
  section.dataset.dashboardCompare = "true";
  section.className = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm";
  renderDashboard(section);
}

export default function App28() {
  useEffect(() => {
    let raf = 0;
    const run = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => integrateCompareDashboard(false));
    };
    run();
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.addedNodes?.length)) run();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);
  return <App27 />;
}
