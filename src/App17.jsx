import React, { useEffect, useMemo, useRef, useState } from "react";
import App8 from "./App8.jsx";

const STORAGE_KEY = "ki-kernel-szenarien-v8";

const modules = [
  { id: "modellierung", title: "Szenario", group: "Kernarbeit", description: "Hauptarbeitsbereich für Szenario, Annahmen, Personas, Ressourcen, Interventionen, Strategien, Report, Speicher und Vergleich.", type: "react" },
  { id: "import", title: "Import+", group: "Eingabe", description: "Erweiterter Dokumentimport für TXT, MD, JSON, PDF und DOCX mit Übergabe in die Haupt-App.", path: "/import-plus.html" },
  { id: "beratung", title: "Beratung", group: "Beratung", description: "Persönlicher Beratungsarbeitsplatz mit Fallakte, Notizen, To-dos, Journal und Beratungsdossier.", path: "/beratung.html" },
  { id: "bericht", title: "Bericht+", group: "Output", description: "Arbeitsreport und Management-Briefing aus gespeicherten Szenarien erzeugen.", type: "nativeReport" },
  { id: "vergleich", title: "Vergleich+", group: "Simulation", description: "Beratungsfähiger A/B/C-Vergleich gespeicherter Szenarien mit Zielkonfliktanalyse.", type: "nativeCompare" },
  { id: "phasen", title: "Phasen", group: "Simulation", description: "Phasenmodell mit Ressourcenverlauf, Kipppunkten und Phasenbericht.", path: "/phasenmodell.html" },
  { id: "beziehungen", title: "Beziehungen", group: "Simulation", description: "Beziehungsmodell mit Koalitionen, Konfliktachsen, Brückenrollen und isolierten Rollen.", path: "/beziehungsmodell.html" },
  { id: "hilfe", title: "Hilfe", group: "Service", description: "Hilfeseite, Bedienlogik, Hinweise und Fehlerhilfe.", path: "/hilfe.html" }
];

const arr = (x) => Array.isArray(x) ? x : [];
const n = (x) => Number(x || 0);
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };

function groupedModules() {
  const groups = [];
  modules.forEach((m) => {
    let g = groups.find((x) => x.name === m.group);
    if (!g) { g = { name: m.group, items: [] }; groups.push(g); }
    g.items.push(m);
  });
  return groups;
}

function resourceScore(r) { return (r.direction === "low_good" ? 6 - n(r.current || 1) : n(r.current || 1)) * 20; }
function resourceGap(r) { return r.direction === "low_good" ? n(r.current || 1) - n(r.target || 1) : n(r.target || 1) - n(r.current || 1); }
function avg(list, key) { return list.length ? list.reduce((s, x) => s + n(x[key]), 0) / list.length : 0; }
function strategyScore(s) { return n(s.acceptance) * 3 + n(s.control) * 3 + n(s.innovation) * 2 + n(s.speed) - n(s.risk) * 3; }
function compute(state = {}) {
  const resources = arr(state.resources), personas = arr(state.personas), assumptions = arr(state.assumptions), interventions = arr(state.interventions), strategies = arr(state.strategies);
  const res = resources.length ? resources.reduce((sum, r) => sum + resourceScore(r), 0) / resources.length : 60;
  const risky = assumptions.filter((a) => a.evidence === "niedrig" || a.uncertainty === "hoch");
  const hasGov = interventions.some((i) => /daten|datenschutz|dokumentation|governance|checkliste|mav/i.test(`${i.name} ${i.target}`));
  const hasPart = interventions.some((i) => /beteilig|reflexion|jour fixe|rollenklärung|workshop|interview|steelman/i.test(`${i.name} ${i.target}`));
  const acceptance = Math.round(Math.min(100, 20 + avg(personas, "trust") * 8 + avg(personas, "aiLiteracy") * 3 + avg(personas, "changeEnergy") * 4 + (hasPart ? 16 : 0) + res * 0.15 - risky.length * 4));
  const governance = Math.round(Math.min(100, 30 + avg(personas, "riskSense") * 5 + (hasGov ? 22 : 0) + res * 0.18));
  const learning = Math.round(Math.min(100, 25 + avg(personas, "aiLiteracy") * 7 + avg(personas, "changeEnergy") * 5 + interventions.length * 5));
  const risk = Math.round(Math.max(0, 100 - (acceptance * 0.35 + governance * 0.4 + learning * 0.15 + res * 0.1)));
  const bestStrategy = [...strategies].sort((a, b) => strategyScore(b) - strategyScore(a))[0];
  return { acceptance, governance, learning, resources: Math.round(res), risk, risky, deficits: resources.filter((r) => resourceGap(r) > 0), bestStrategy, score: acceptance + governance + learning + res - risk };
}

function isDeleteTarget(target) {
  const el = target?.closest?.("button, a, [role='button']");
  if (!el) return false;
  const text = (el.textContent || "").toLowerCase().trim();
  const title = (el.getAttribute("title") || "").toLowerCase();
  return /löschen|loeschen|delete|entfernen|verwerfen/.test(`${text} ${title}`);
}
function confirmDelete(event) {
  if (!isDeleteTarget(event.target)) return;
  const ok = window.confirm("Wirklich löschen? Diese Aktion kann nicht automatisch rückgängig gemacht werden.");
  if (!ok) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }
}

function Panel({ title, children, action }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><h2 className="text-2xl font-black text-slate-950">{title}</h2>{action}</div><div className="mt-4">{children}</div></section>;
}
function SmallCard({ title, children, tone = "white" }) {
  const cls = tone === "good" ? "bg-emerald-50 border-emerald-200" : tone === "warn" ? "bg-amber-50 border-amber-200" : tone === "bad" ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200";
  return <div className={`rounded-2xl border p-4 ${cls}`}><h3 className="font-black text-slate-950">{title}</h3><div className="mt-2 text-sm leading-6 text-slate-700">{children}</div></div>;
}
function SelectScenario({ saved, value, onChange, label = "Gespeichertes Szenario" }) {
  return <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">{label}</span><select className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}><option value="">— auswählen —</option>{saved.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>;
}
function MetricsTable({ calc }) {
  return <table className="w-full text-sm"><tbody>{[["Akzeptanz", calc.acceptance], ["Governance", calc.governance], ["Ressourcen", calc.resources], ["Lernfähigkeit", calc.learning], ["Restrisiko", calc.risk]].map(([k, v]) => <tr key={k} className="border-t"><th className="bg-slate-50 p-2 text-left font-black">{k}</th><td className="p-2">{Math.round(v)}</td></tr>)}</tbody></table>;
}
function listItems(items, fallback = "Keine Einträge.") {
  const clean = arr(items).filter(Boolean);
  return clean.length ? clean.map((x, i) => <li key={i}>{x}</li>) : <li>{fallback}</li>;
}
function copyText(text) { navigator.clipboard?.writeText(text); }
function downloadText(filename, text) { const blob = new Blob([text], { type: "text/plain;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href); }

function nextSteps(state, calc) {
  const steps = [];
  if (calc.risky.length) steps.push("Riskante Annahmen mit Auftraggeber oder Beteiligten validieren.");
  if (calc.deficits.length) steps.push(`Ressourcenengpass bearbeiten: ${calc.deficits[0].name}.`);
  if (calc.bestStrategy) steps.push(`Strategieentscheidung vorbereiten: ${calc.bestStrategy.name}.`);
  arr(state.interventions).slice(0, 2).forEach((i) => steps.push(`Intervention konkretisieren: ${i.name}.`));
  steps.push("Grenzen der Simulation transparent machen und keine personenbezogene Bewertung ableiten.");
  return steps;
}
function reportText(item, mode, audience, note, decision) {
  if (!item) return "";
  const state = item.state || {}, calc = compute(state);
  const title = state.context?.title || item.name;
  const strategy = calc.bestStrategy ? `${calc.bestStrategy.name}: ${calc.bestStrategy.decisionSignal || calc.bestStrategy.description}` : "Keine Strategie vorhanden.";
  if (mode === "briefing") return `Management-Briefing\n\nSzenario:\n${title}\n\nAdressat:\n${audience}\n\nEntscheidungsbedarf:\n${decision || state.context?.decisionQuestion || "nicht angegeben"}\n\n1. Kernaussage\n${calc.risk > 45 ? "Das Szenario ist risikobehaftet; Annahmen, Ressourcenengpässe und Governance-Fragen sollten vor Umsetzung geklärt werden." : "Das Szenario wirkt bearbeitbar; Entscheidung und Umsetzung sollten an Engpässen, Annahmen und Nebenwirkungen ausgerichtet werden."}\n\n2. Lagebild\nAkzeptanz: ${calc.acceptance}\nGovernance: ${calc.governance}\nRessourcen: ${calc.resources}\nLernfähigkeit: ${calc.learning}\nRestrisiko: ${calc.risk}\n\n3. Größte Risiken\n${[...calc.deficits.slice(0,3).map((r)=>`${r.name}: ${r.bottleneck || "Engpass ohne Notiz"}`), ...calc.risky.slice(0,3).map((a)=>`Riskante Annahme: ${a.text}`)].join("\n") || "Keine priorisierten Risiken."}\n\n4. Empfehlung\n${strategy}\n\n5. Nächste Schritte\n${nextSteps(state, calc).map((s)=>`- ${s}`).join("\n")}\n\n6. Grenzen\nHeuristische Verdichtung; keine empirische Organisationsdiagnose, keine Rechtsberatung, keine personenbezogene Bewertung.`;
  return `Arbeitsreport\n\nSzenario:\n${title}\nAdressat: ${audience}\nBearbeiterhinweis: ${note || "—"}\n\n1. Ausgangslage\nDomäne: ${state.context?.domain || "—"}\nEntscheidungsfrage: ${state.context?.decisionQuestion || "—"}\nZiel: ${state.context?.goal || "—"}\nGrenzen: ${state.context?.boundaries || "—"}\n\n2. Simulationsannahmen\n${arr(state.assumptions).map((a)=>`- ${a.text} [Evidenz: ${a.evidence}, Unsicherheit: ${a.uncertainty}, Status: ${a.sourceStatus}]`).join("\n") || "Keine Annahmen."}\n\n3. Persona- und Stakeholderanalyse\n${arr(state.personas).map((p)=>`- ${p.name}: Rolle ${p.role}, Haltung ${p.stance}, Einfluss ${p.influence}, Vertrauen ${p.trust}, Kommunikationsbedarf: ${p.communicationNeed || "—"}`).join("\n") || "Keine Personas."}\n\n4. Ressourcen- und Risikolage\nAkzeptanz ${calc.acceptance}, Governance ${calc.governance}, Ressourcen ${calc.resources}, Lernfähigkeit ${calc.learning}, Restrisiko ${calc.risk}\n\n5. Kritische Engpässe\n${calc.deficits.map((r)=>`- ${r.name}: ${r.bottleneck || "ohne Notiz"}`).join("\n") || "Keine priorisierten Engpässe."}\n\n6. Interventionsoptionen\n${arr(state.interventions).map((i)=>`- ${i.name}: Ziel ${i.target}, Nutzen ${i.benefit}, Nebenwirkung ${i.sideEffect}, Aufwand ${i.effort}`).join("\n") || "Keine Interventionen."}\n\n7. Entscheidungsmatrix\n${arr(state.strategies).map((s)=>`- ${s.name}: Tempo ${s.speed}, Akzeptanz ${s.acceptance}, Kontrolle ${s.control}, Innovation ${s.innovation}, Risiko ${s.risk}. Signal: ${s.decisionSignal || "—"}`).join("\n") || "Keine Strategien."}\n\n8. Empfohlene Strategie\n${strategy}\n\n9. Maßnahmenplan\n${nextSteps(state, calc).map((s)=>`- ${s}`).join("\n")}\n\n10. Offene Fragen\n${arr(state.openQuestions).map((q)=>`- ${q}`).join("\n") || "Keine offenen Fragen."}\n\n11. Datenschutz-/Governance-Hinweise\n- Keine echten Personenprofile verwenden.\n- Annahmen als Hypothesen markieren und validieren.\n- Sensible oder personenbezogene Daten vermeiden oder anonymisieren.\n\n12. Grenzen\nDie Simulation ist keine empirische Organisationsdiagnose. Ergebnisse müssen mit realen Beteiligten validiert werden.`;
}

function NativeReport() {
  const [saved, setSaved] = useState([]), [id, setId] = useState(""), [mode, setMode] = useState("work"), [audience, setAudience] = useState("interne Beratung"), [note, setNote] = useState(""), [decision, setDecision] = useState("");
  useEffect(() => { const items = loadSaved(); setSaved(items); if (items[0]) setId(items[0].id); }, []);
  const item = saved.find((s) => s.id === id), calc = item ? compute(item.state) : null, text = reportText(item, mode, audience, note, decision);
  return <div className="space-y-5"><Panel title="Bericht+ · natives Modul" action={<button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white" onClick={() => setSaved(loadSaved())}>Speicher neu laden</button>}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><SelectScenario saved={saved} value={id} onChange={setId}/><label><span className="mb-1 block text-sm font-bold text-slate-700">Berichtsmodus</span><select className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" value={mode} onChange={(e)=>setMode(e.target.value)}><option value="work">Arbeitsreport</option><option value="briefing">Management-Briefing</option></select></label><label><span className="mb-1 block text-sm font-bold text-slate-700">Adressat</span><input className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" value={audience} onChange={(e)=>setAudience(e.target.value)}/></label><label><span className="mb-1 block text-sm font-bold text-slate-700">Entscheidungsbedarf</span><input className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" value={decision} onChange={(e)=>setDecision(e.target.value)} placeholder="optional"/></label></div><label className="mt-4 block"><span className="mb-1 block text-sm font-bold text-slate-700">Bearbeiterhinweis</span><textarea className="min-h-24 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="optional"/></label><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black" onClick={()=>copyText(text)}>Bericht kopieren</button><button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black" onClick={()=>downloadText("bericht-plus.txt", text)}>Als TXT herunterladen</button></div></Panel>{item && calc && <div className="grid gap-5 xl:grid-cols-[360px_1fr]"><Panel title="Lagebild"><MetricsTable calc={calc}/><div className="mt-4"><SmallCard title="Empfohlene Strategie" tone="good">{calc.bestStrategy ? `${calc.bestStrategy.name}: ${calc.bestStrategy.decisionSignal || calc.bestStrategy.description}` : "Keine Strategie vorhanden."}</SmallCard></div></Panel><Panel title={mode === "briefing" ? "Management-Briefing" : "Arbeitsreport"}><pre className="max-h-[72vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">{text}</pre></Panel></div>}</div>;
}

function compareInterpretation(items) {
  if (items.length < 2) return "Bitte mindestens zwei Szenarien auswählen.";
  const delta = items[0].calc.score - items[1].calc.score;
  if (delta > 10) return `${items[0].name} wirkt insgesamt tragfähiger als ${items[1].name}.`;
  if (delta < -10) return `${items[1].name} wirkt insgesamt tragfähiger als ${items[0].name}.`;
  return "Die Varianten liegen nah beieinander; Entscheidung über Engpässe, Nebenwirkungen und Governance-Anforderungen treffen.";
}
function targetConflicts(item) {
  const c = item.calc, flags = [];
  if (c.acceptance >= 70 && c.governance < 65) flags.push("hohe Akzeptanz bei schwächerer Governance");
  if (c.governance >= 75 && c.acceptance < 65) flags.push("starke Governance bei begrenzter Akzeptanz");
  if (c.learning >= 70 && c.risk > 35) flags.push("hohes Lernpotenzial bei relevantem Restrisiko");
  if (c.resources < 60 && c.acceptance >= 65) flags.push("Akzeptanz wirkt besser als Ressourcenlage");
  return flags.length ? flags : ["keine auffällige Zielkonfliktmarkierung"];
}
function compareText(items) {
  if (items.length < 2) return "Kein Vergleich erzeugt.";
  return `Vergleich+ Bericht\n\nAusgewählte Szenarien:\n${items.map((x, i)=>`${i+1}. ${x.name}`).join("\n")}\n\nBeratungsverdichtung:\n${compareInterpretation(items)}\n\nKennzahlen:\n${items.map((x)=>`${x.name}: Akzeptanz ${x.calc.acceptance}, Governance ${x.calc.governance}, Ressourcen ${x.calc.resources}, Lernfähigkeit ${x.calc.learning}, Restrisiko ${x.calc.risk}`).join("\n")}\n\nZentrale Engpässe:\n${items.map((x)=>`${x.name}: ${x.calc.deficits.map((r)=>`${r.name} (${r.bottleneck || "ohne Notiz"})`).join("; ") || "keine"}`).join("\n")}\n\nRiskante Annahmen:\n${items.map((x)=>`${x.name}: ${x.calc.risky.map((a)=>a.text).join("; ") || "keine"}`).join("\n")}`;
}
function NativeCompare() {
  const [saved, setSaved] = useState([]), [ids, setIds] = useState(["", "", ""]);
  useEffect(() => { const items = loadSaved(); setSaved(items); setIds([items[0]?.id || "", items[1]?.id || "", ""]); }, []);
  const selected = ids.map((id) => saved.find((s) => s.id === id)).filter(Boolean).map((item) => ({ ...item, calc: compute(item.state) })).sort((a, b) => b.calc.score - a.calc.score);
  const text = compareText(selected), metrics = [["Akzeptanz","acceptance"],["Governance","governance"],["Ressourcen","resources"],["Lernfähigkeit","learning"],["Restrisiko","risk"]];
  return <div className="space-y-5"><Panel title="Vergleich+ · natives Modul" action={<button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white" onClick={() => setSaved(loadSaved())}>Speicher neu laden</button>}><div className="grid gap-4 md:grid-cols-3"><SelectScenario saved={saved} label="Szenario A" value={ids[0]} onChange={(v)=>setIds([v, ids[1], ids[2]])}/><SelectScenario saved={saved} label="Szenario B" value={ids[1]} onChange={(v)=>setIds([ids[0], v, ids[2]])}/><SelectScenario saved={saved} label="Szenario C optional" value={ids[2]} onChange={(v)=>setIds([ids[0], ids[1], v])}/></div><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black" onClick={()=>copyText(text)}>Vergleichsbericht kopieren</button><button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black" onClick={()=>downloadText("vergleich-plus-bericht.txt", text)}>Als TXT herunterladen</button></div></Panel>{selected.length >= 2 && <><Panel title="Beratungsverdichtung"><SmallCard title="Interpretation" tone="good">{compareInterpretation(selected)}</SmallCard><div className="mt-4 flex flex-wrap gap-2">{selected.map((x, i)=><span key={x.id} className={`rounded-full px-3 py-1 text-sm font-black ${i===0?"bg-emerald-100 text-emerald-900":"bg-slate-100 text-slate-700"}`}>{i+1}. {x.name} · Score {Math.round(x.calc.score)}</span>)}</div></Panel><Panel title="Kennzahlenvergleich"><div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="bg-slate-50 p-2 text-left">Kriterium</th>{selected.map((x)=><th key={x.id} className="bg-slate-50 p-2 text-left">{x.name}</th>)}</tr></thead><tbody>{metrics.map(([label,key])=><tr key={key} className="border-t"><td className="p-2 font-black">{label}</td>{selected.map((x)=><td key={x.id} className="p-2">{Math.round(x.calc[key])}</td>)}</tr>)}</tbody></table></div></Panel><div className="grid gap-5 xl:grid-cols-2">{selected.map((x)=><Panel key={x.id} title={x.name}><div className="grid gap-4 md:grid-cols-2"><SmallCard title="Strategie" tone="good">{x.calc.bestStrategy ? `${x.calc.bestStrategy.name}: ${x.calc.bestStrategy.decisionSignal || x.calc.bestStrategy.description}` : "—"}</SmallCard><SmallCard title="Zielkonflikte" tone="warn"><ul className="list-disc pl-5">{listItems(targetConflicts(x))}</ul></SmallCard><SmallCard title="Engpässe" tone="bad"><ul className="list-disc pl-5">{listItems(x.calc.deficits.map((r)=>`${r.name}: ${r.bottleneck || "ohne Notiz"}`), "Keine priorisierten Engpässe.")}</ul></SmallCard><SmallCard title="Riskante Annahmen" tone="warn"><ul className="list-disc pl-5">{listItems(x.calc.risky.map((a)=>a.text), "Keine riskanten Annahmen markiert.")}</ul></SmallCard></div></Panel>)}</div><Panel title="Vergleichsbericht"><pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">{text}</pre></Panel></>}</div>;
}

function CompatibilityFrame({ module, active }) {
  const ref = useRef(null);
  return <section className={`${active ? "block" : "hidden"} rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden`}><div className="border-b border-slate-200 bg-white p-4 md:p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Kompatibilitätsmodul</div><h2 className="mt-1 text-2xl font-black text-slate-950">{module.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{module.description}</p></div><a className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-100" href={module.path} target="_blank" rel="noreferrer">In neuem Tab öffnen</a></div></div><iframe ref={ref} title={module.title} src={module.path} onLoad={() => { try { const doc = ref.current?.contentWindow?.document; doc?.removeEventListener("click", confirmDelete, true); doc?.addEventListener("click", confirmDelete, true); } catch { /* same-origin safety */ } }} className="h-[78vh] w-full border-0 bg-white" /></section>;
}

function KeepAliveModules({ activeId }) {
  return <>{modules.map((m) => {
    const active = activeId === m.id;
    if (m.type === "react") return <section key={m.id} className={active ? "block" : "hidden"}><div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden"><App8 /></div></section>;
    if (m.type === "nativeReport") return <section key={m.id} className={active ? "block" : "hidden"}><NativeReport /></section>;
    if (m.type === "nativeCompare") return <section key={m.id} className={active ? "block" : "hidden"}><NativeCompare /></section>;
    return <CompatibilityFrame key={m.id} module={m} active={active} />;
  })}</>;
}

export default function App17() {
  const [activeId, setActiveId] = useState("modellierung");
  const active = modules.find((m) => m.id === activeId) || modules[0];
  const groups = useMemo(() => groupedModules(), []);
  useEffect(() => { document.addEventListener("click", confirmDelete, true); return () => document.removeEventListener("click", confirmDelete, true); }, []);
  return <main className="min-h-screen bg-slate-100 text-slate-950"><header className="border-b border-slate-800 bg-slate-950 text-white"><div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8"><div className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-bold text-slate-300">KI-Kernel GPT 1.2 · ruhige Navigation und Löschschutz</div><div className="mt-4 grid gap-4 lg:grid-cols-[1fr_420px] lg:items-end"><div><h1 className="text-4xl font-black tracking-tight md:text-5xl">Beratungsfähiger Organisationssimulator</h1><p className="mt-3 max-w-4xl text-base leading-7 text-slate-300">Module bleiben geladen und werden beim Wechsel nur ein- oder ausgeblendet. Löschaktionen werden zentral abgefragt.</p></div><div className="rounded-3xl border border-white/10 bg-white/5 p-4"><div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Aktives Modul</div><div className="mt-1 text-2xl font-black">{active.title}</div><p className="mt-1 text-sm leading-6 text-slate-300">{active.description}</p></div></div></div></header><div className="mx-auto grid max-w-[1600px] gap-5 px-4 py-5 md:px-8 lg:grid-cols-[290px_1fr]"><aside className="lg:sticky lg:top-4 lg:self-start"><nav className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm"><div className="px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">Module</div><div className="space-y-4">{groups.map((group)=><div key={group.name}><div className="px-3 pb-1 text-xs font-black uppercase tracking-wide text-slate-500">{group.name}</div><div className="space-y-1">{group.items.map((m)=><button key={m.id} onClick={()=>setActiveId(m.id)} className={`w-full rounded-2xl px-3 py-3 text-left text-sm font-extrabold transition ${activeId===m.id?"bg-slate-950 text-white shadow-sm":"text-slate-700 hover:bg-slate-100"}`}><div>{m.title}</div><div className={`mt-1 text-xs font-semibold leading-4 ${activeId===m.id?"text-slate-300":"text-slate-400"}`}>{m.description}</div></button>)}</div></div>)}</div></nav><section className="mt-4 rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950"><div className="font-black">Stabilisierung</div><p className="mt-1">Navigation ist Keep-Alive. Löschklicks lösen eine Sicherheitsabfrage aus.</p></section></aside><section className="min-w-0"><KeepAliveModules activeId={activeId} /></section></div></main>;
}
