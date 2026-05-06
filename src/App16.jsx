import React, { useEffect, useMemo, useState } from "react";
import App8 from "./App8.jsx";

const STORAGE_KEY = "ki-kernel-szenarien-v8";

const modules = [
  { id: "modellierung", title: "Szenario", group: "Kernarbeit", description: "Hauptarbeitsbereich für Vorlagen, Import Light, Ausgangslage, Annahmen, Personas, Ressourcen, Interventionen, Strategien, Report, Speicher und Vergleich.", type: "react" },
  { id: "import", title: "Import+", group: "Eingabe", description: "Erweiterter Dokumentimport für TXT, MD, JSON, PDF und DOCX mit Übergabe in die Haupt-App.", path: "/import-plus.html" },
  { id: "beratung", title: "Beratung", group: "Beratung", description: "Persönlicher Beratungsarbeitsplatz mit Fallakte, Notizen, To-dos, Journal und Beratungsdossier.", path: "/beratung.html" },
  { id: "bericht", title: "Bericht+", group: "Output", description: "Arbeitsreport und Management-Briefing aus gespeicherten Szenarien erzeugen.", type: "nativeReport" },
  { id: "vergleich", title: "Vergleich+", group: "Simulation", description: "Beratungsfähiger A/B/C-Vergleich gespeicherter Szenarien mit Zielkonfliktanalyse.", type: "nativeCompare" },
  { id: "phasen", title: "Phasen", group: "Simulation", description: "Phasenmodell mit Ressourcenverlauf, Kipppunkten und Phasenbericht.", path: "/phasenmodell.html" },
  { id: "beziehungen", title: "Beziehungen", group: "Simulation", description: "Beziehungsmodell mit Koalitionen, Konfliktachsen, Brückenrollen und isolierten Rollen.", path: "/beziehungsmodell.html" },
  { id: "hilfe", title: "Hilfe", group: "Service", description: "Aktuelle Hilfeseite, Bedienlogik, Hinweise und Fehlerhilfe.", path: "/hilfe.html" }
];

const arr = (x) => Array.isArray(x) ? x : [];
const num = (x) => Number(x || 0);

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function resourceScore(r) {
  return (r.direction === "low_good" ? 6 - num(r.current || 1) : num(r.current || 1)) * 20;
}
function resourceGap(r) {
  return r.direction === "low_good" ? num(r.current || 1) - num(r.target || 1) : num(r.target || 1) - num(r.current || 1);
}
function avg(list, key) {
  return list.length ? list.reduce((sum, item) => sum + num(item[key]), 0) / list.length : 0;
}
function strategyScore(s) {
  return num(s.acceptance) * 3 + num(s.control) * 3 + num(s.innovation) * 2 + num(s.speed) - num(s.risk) * 3;
}
function compute(state = {}) {
  const resources = arr(state.resources);
  const personas = arr(state.personas);
  const assumptions = arr(state.assumptions);
  const interventions = arr(state.interventions);
  const strategies = arr(state.strategies);
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

function groupedModules() {
  const groups = [];
  for (const module of modules) {
    let group = groups.find((g) => g.name === module.group);
    if (!group) { group = { name: module.group, items: [] }; groups.push(group); }
    group.items.push(module);
  }
  return groups;
}

function Panel({ title, children, action }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><h2 className="text-2xl font-black text-slate-950">{title}</h2>{action}</div><div className="mt-4">{children}</div></section>;
}
function SmallCard({ title, children, tone = "white" }) {
  const toneClass = tone === "good" ? "bg-emerald-50 border-emerald-200" : tone === "warn" ? "bg-amber-50 border-amber-200" : tone === "bad" ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200";
  return <div className={`rounded-2xl border p-4 ${toneClass}`}><h3 className="font-black text-slate-950">{title}</h3><div className="mt-2 text-sm leading-6 text-slate-700">{children}</div></div>;
}
function SelectScenario({ saved, value, onChange, label = "Gespeichertes Szenario" }) {
  return <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">{label}</span><select className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}><option value="">— auswählen —</option>{saved.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>;
}
function MetricsTable({ calc }) {
  return <table className="w-full text-sm"><tbody>{[["Akzeptanz", calc.acceptance], ["Governance", calc.governance], ["Ressourcen", calc.resources], ["Lernfähigkeit", calc.learning], ["Restrisiko", calc.risk]].map(([k, v]) => <tr key={k} className="border-t"><th className="bg-slate-50 p-2 text-left font-black">{k}</th><td className="p-2">{Math.round(v)}</td></tr>)}</tbody></table>;
}
function listText(items, fallback = "Keine Einträge.") {
  const clean = arr(items).filter(Boolean);
  return clean.length ? clean.map((x, idx) => <li key={idx}>{x}</li>) : <li>{fallback}</li>;
}
function copy(text) { navigator.clipboard?.writeText(text); }
function download(filename, text) { const blob = new Blob([text], { type: "text/plain;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href); }

function coreMessage(state, calc) {
  if (calc.risk > 45) return "Das Szenario ist risikobehaftet. Vor Umsetzung sollten Annahmen, Ressourcenengpässe und Governance-Fragen geklärt werden.";
  if (calc.acceptance >= 70 && calc.governance >= 70) return "Das Szenario wirkt grundsätzlich tragfähig, wenn die identifizierten Engpässe aktiv bearbeitet werden.";
  if (calc.governance < 60) return "Die Tragfähigkeit ist ohne stärkere Governance- und Klärungsstruktur begrenzt.";
  if (calc.acceptance < 60) return "Die größte Schwachstelle liegt in Akzeptanz, Vertrauen oder Beteiligung.";
  return "Das Szenario ist bearbeitbar; die Entscheidung sollte an Engpässen, Annahmen und Nebenwirkungen ausgerichtet werden.";
}
function strongestLever(state, calc) {
  const deficit = calc.deficits[0];
  if (deficit) return `Zentraler Hebel ist die Ressource „${deficit.name}“: ${deficit.bottleneck || "Engpass klären"}.`;
  const intervention = arr(state.interventions)[0];
  if (intervention) return `Naheliegender Hebel ist die Intervention „${intervention.name}“ mit Ziel „${intervention.target}“.`;
  return "Der stärkste Hebel sollte über eine Nachschärfung der Ressourcen und Interventionen bestimmt werden.";
}
function nextSteps(state, calc) {
  const steps = [];
  if (calc.risky.length) steps.push("Riskante Annahmen mit Auftraggeber oder Beteiligten validieren.");
  if (calc.deficits.length) steps.push(`Ressourcenengpass bearbeiten: ${calc.deficits[0].name}.`);
  if (calc.bestStrategy) steps.push(`Strategieentscheidung vorbereiten: ${calc.bestStrategy.name}.`);
  arr(state.interventions).slice(0, 2).forEach((i) => steps.push(`Intervention konkretisieren: ${i.name}.`));
  steps.push("Ergebnisse nicht personenbezogen verwenden und Grenzen der Simulation transparent machen.");
  return steps;
}
function reportText(item, mode, audience, note, decision) {
  if (!item) return "";
  const state = item.state || {};
  const calc = compute(state);
  if (mode === "briefing") {
    return `Management-Briefing\n\nSzenario:\n${state.context?.title || item.name}\n\nAdressat:\n${audience}\n\nEntscheidungsbedarf:\n${decision || state.context?.decisionQuestion || "nicht angegeben"}\n\n1. Kernaussage\n${coreMessage(state, calc)}\n\n2. Lagebild\nAkzeptanz: ${calc.acceptance}\nGovernance: ${calc.governance}\nRessourcen: ${calc.resources}\nLernfähigkeit: ${calc.learning}\nRestrisiko: ${calc.risk}\n\n3. Größte Risiken\n${[...calc.deficits.slice(0,3).map((r)=>`${r.name}: ${r.bottleneck || "Engpass ohne Notiz"}`), ...calc.risky.slice(0,3).map((a)=>`Riskante Annahme: ${a.text}`)].join("\n") || "Keine priorisierten Risiken."}\n\n4. Stärkster Hebel\n${strongestLever(state, calc)}\n\n5. Empfehlung\n${calc.bestStrategy ? `${calc.bestStrategy.name}: ${calc.bestStrategy.decisionSignal || calc.bestStrategy.description}` : "Strategieempfehlung noch nicht belastbar."}\n\n6. Nächste Schritte\n${nextSteps(state, calc).map((s)=>`- ${s}`).join("\n")}\n\n7. Grenzen\nDieses Briefing ist eine heuristische Verdichtung. Es ersetzt keine empirische Organisationsdiagnose, keine Rechtsberatung und keine personenbezogene Bewertung.`;
  }
  return `Arbeitsreport\n\nSzenario:\n${state.context?.title || item.name}\nAdressat: ${audience}\nBearbeiterhinweis: ${note || "—"}\n\n1. Ausgangslage\nDomäne: ${state.context?.domain || "—"}\nEntscheidungsfrage: ${state.context?.decisionQuestion || "—"}\nZiel: ${state.context?.goal || "—"}\nGrenzen: ${state.context?.boundaries || "—"}\n\n2. Simulationsannahmen\n${arr(state.assumptions).map((a)=>`- ${a.text} [Evidenz: ${a.evidence}, Unsicherheit: ${a.uncertainty}, Status: ${a.sourceStatus}]`).join("\n") || "Keine Annahmen."}\n\n3. Persona- und Stakeholderanalyse\n${arr(state.personas).map((p)=>`- ${p.name}: Rolle ${p.role}, Haltung ${p.stance}, Einfluss ${p.influence}, Vertrauen ${p.trust}, Kommunikationsbedarf: ${p.communicationNeed || "—"}`).join("\n") || "Keine Personas."}\n\n4. Ressourcen- und Risikolage\nAkzeptanz ${calc.acceptance}, Governance ${calc.governance}, Ressourcen ${calc.resources}, Lernfähigkeit ${calc.learning}, Restrisiko ${calc.risk}\n\n5. Kritische Engpässe\n${calc.deficits.map((r)=>`- ${r.name}: ${r.bottleneck || "ohne Notiz"}`).join("\n") || "Keine priorisierten Engpässe."}\n\n6. Interventionsoptionen\n${arr(state.interventions).map((i)=>`- ${i.name}: Ziel ${i.target}, Nutzen ${i.benefit}, Nebenwirkung ${i.sideEffect}, Aufwand ${i.effort}`).join("\n") || "Keine Interventionen."}\n\n7. Entscheidungsmatrix\n${arr(state.strategies).map((s)=>`- ${s.name}: Tempo ${s.speed}, Akzeptanz ${s.acceptance}, Kontrolle ${s.control}, Innovation ${s.innovation}, Risiko ${s.risk}. Signal: ${s.decisionSignal || "—"}`).join("\n") || "Keine Strategien."}\n\n8. Empfohlene Strategie\n${calc.bestStrategy ? `${calc.bestStrategy.name}: ${calc.bestStrategy.decisionSignal || calc.bestStrategy.description}` : "Keine Strategie vorhanden."}\n\n9. Maßnahmenplan\n${nextSteps(state, calc).map((s)=>`- ${s}`).join("\n")}\n\n10. Offene Fragen\n${arr(state.openQuestions).map((q)=>`- ${q}`).join("\n") || "Keine offenen Fragen."}\n\n11. Datenschutz-/Governance-Hinweise\n- Keine echten Personenprofile verwenden.\n- Annahmen als Hypothesen markieren und validieren.\n- Sensible oder personenbezogene Daten vermeiden oder anonymisieren.\n\n12. Grenzen\nDie Simulation ist keine empirische Organisationsdiagnose. Sie erzeugt plausible Hypothesen auf Basis der eingegebenen Daten. Ergebnisse müssen mit realen Beteiligten validiert werden.`;
}

function NativeReport() {
  const [saved, setSaved] = useState([]);
  const [id, setId] = useState("");
  const [mode, setMode] = useState("work");
  const [audience, setAudience] = useState("interne Beratung");
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState("");
  useEffect(() => { const items = loadSaved(); setSaved(items); if (items[0]) setId(items[0].id); }, []);
  const item = saved.find((s) => s.id === id);
  const calc = item ? compute(item.state) : null;
  const text = reportText(item, mode, audience, note, decision);
  return <div className="space-y-5"><Panel title="Bericht+ · natives Modul" action={<button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white" onClick={() => { const items = loadSaved(); setSaved(items); }}>Speicher neu laden</button>}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><SelectScenario saved={saved} value={id} onChange={setId}/><label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">Berichtsmodus</span><select className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" value={mode} onChange={(e)=>setMode(e.target.value)}><option value="work">Arbeitsreport</option><option value="briefing">Management-Briefing</option></select></label><label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">Adressat</span><select className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" value={audience} onChange={(e)=>setAudience(e.target.value)}><option>interne Beratung</option><option>Leitung / Vorstand</option><option>Projektgruppe</option><option>QM / Governance</option><option>Workshopmoderation</option></select></label><label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">Entscheidungsbedarf</span><input className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" value={decision} onChange={(e)=>setDecision(e.target.value)} placeholder="optional"/></label></div><label className="mt-4 block"><span className="mb-1 block text-sm font-bold text-slate-700">Bearbeiterhinweis</span><textarea className="min-h-24 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="optional"/></label><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black" onClick={()=>copy(text)}>Bericht kopieren</button><button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black" onClick={()=>download("bericht-plus.txt", text)}>Als TXT herunterladen</button></div></Panel>{item && calc && <div className="grid gap-5 xl:grid-cols-[360px_1fr]"><Panel title="Lagebild"><MetricsTable calc={calc}/><div className="mt-4"><SmallCard title="Empfohlene Strategie" tone="good">{calc.bestStrategy ? `${calc.bestStrategy.name}: ${calc.bestStrategy.decisionSignal || calc.bestStrategy.description}` : "Keine Strategie vorhanden."}</SmallCard></div></Panel><Panel title={mode === "briefing" ? "Management-Briefing" : "Arbeitsreport"}><pre className="max-h-[72vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">{text}</pre></Panel></div>}</div>;
}

function compareInterpretation(items) {
  if (items.length < 2) return "Bitte mindestens zwei Szenarien auswählen.";
  const [a, b] = items;
  const delta = a.calc.score - b.calc.score;
  if (delta > 10) return `${a.name} wirkt insgesamt tragfähiger als ${b.name}.`;
  if (delta < -10) return `${b.name} wirkt insgesamt tragfähiger als ${a.name}.`;
  return "Die Varianten liegen nah beieinander; die Entscheidung sollte über Engpässe, Nebenwirkungen und Governance-Anforderungen getroffen werden.";
}
function targetConflicts(item) {
  const c = item.calc;
  const flags = [];
  if (c.acceptance >= 70 && c.governance < 65) flags.push("hohe Akzeptanz bei schwächerer Governance");
  if (c.governance >= 75 && c.acceptance < 65) flags.push("starke Governance bei begrenzter Akzeptanz");
  if (c.learning >= 70 && c.risk > 35) flags.push("hohes Lernpotenzial bei relevantem Restrisiko");
  if (c.resources < 60 && c.acceptance >= 65) flags.push("Akzeptanz wirkt besser als Ressourcenlage");
  return flags.length ? flags : ["keine auffällige Zielkonfliktmarkierung"];
}
function compareText(items) {
  if (items.length < 2) return "Kein Vergleich erzeugt.";
  return `Vergleich+ Bericht\n\nAusgewählte Szenarien:\n${items.map((x, idx)=>`${idx+1}. ${x.name}`).join("\n")}\n\nBeratungsverdichtung:\n${compareInterpretation(items)}\n\nKennzahlen:\n${items.map((x)=>`${x.name}: Akzeptanz ${x.calc.acceptance}, Governance ${x.calc.governance}, Ressourcen ${x.calc.resources}, Lernfähigkeit ${x.calc.learning}, Restrisiko ${x.calc.risk}`).join("\n")}\n\nZentrale Engpässe:\n${items.map((x)=>`${x.name}: ${x.calc.deficits.map((r)=>`${r.name} (${r.bottleneck || "ohne Notiz"})`).join("; ") || "keine"}`).join("\n")}\n\nRiskante Annahmen:\n${items.map((x)=>`${x.name}: ${x.calc.risky.map((a)=>a.text).join("; ") || "keine"}`).join("\n")}\n\nPrüfhinweis:\nDieser Vergleich ist heuristisch. Er ersetzt keine Entscheidung, sondern macht Zielkonflikte, Engpässe und offene Klärungen sichtbarer.`;
}

function NativeCompare() {
  const [saved, setSaved] = useState([]);
  const [ids, setIds] = useState(["", "", ""]);
  useEffect(() => { const items = loadSaved(); setSaved(items); setIds([items[0]?.id || "", items[1]?.id || "", ""]); }, []);
  const selected = ids.map((id) => saved.find((s) => s.id === id)).filter(Boolean).map((item) => ({ ...item, calc: compute(item.state) })).sort((a, b) => b.calc.score - a.calc.score);
  const text = compareText(selected);
  const metrics = [["Akzeptanz","acceptance"],["Governance","governance"],["Ressourcen","resources"],["Lernfähigkeit","learning"],["Restrisiko","risk"]];
  return <div className="space-y-5"><Panel title="Vergleich+ · natives Modul" action={<button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white" onClick={() => setSaved(loadSaved())}>Speicher neu laden</button>}><div className="grid gap-4 md:grid-cols-3"><SelectScenario saved={saved} label="Szenario A" value={ids[0]} onChange={(v)=>setIds([v, ids[1], ids[2]])}/><SelectScenario saved={saved} label="Szenario B" value={ids[1]} onChange={(v)=>setIds([ids[0], v, ids[2]])}/><SelectScenario saved={saved} label="Szenario C optional" value={ids[2]} onChange={(v)=>setIds([ids[0], ids[1], v])}/></div><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black" onClick={()=>copy(text)}>Vergleichsbericht kopieren</button><button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black" onClick={()=>download("vergleich-plus-bericht.txt", text)}>Als TXT herunterladen</button></div></Panel>{selected.length >= 2 && <><Panel title="Beratungsverdichtung"><SmallCard title="Interpretation" tone="good">{compareInterpretation(selected)}</SmallCard><div className="mt-4 flex flex-wrap gap-2">{selected.map((x, idx)=><span key={x.id} className={`rounded-full px-3 py-1 text-sm font-black ${idx===0?"bg-emerald-100 text-emerald-900":"bg-slate-100 text-slate-700"}`}>{idx+1}. {x.name} · Score {Math.round(x.calc.score)}</span>)}</div></Panel><Panel title="Kennzahlenvergleich"><div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="bg-slate-50 p-2 text-left">Kriterium</th>{selected.map((x)=><th key={x.id} className="bg-slate-50 p-2 text-left">{x.name}</th>)}</tr></thead><tbody>{metrics.map(([label,key])=><tr key={key} className="border-t"><td className="p-2 font-black">{label}</td>{selected.map((x)=><td key={x.id} className="p-2">{Math.round(x.calc[key])}</td>)}</tr>)}</tbody></table></div></Panel><div className="grid gap-5 xl:grid-cols-2">{selected.map((x)=><Panel key={x.id} title={x.name}><div className="grid gap-4 md:grid-cols-2"><SmallCard title="Strategie" tone="good">{x.calc.bestStrategy ? `${x.calc.bestStrategy.name}: ${x.calc.bestStrategy.decisionSignal || x.calc.bestStrategy.description}` : "—"}</SmallCard><SmallCard title="Zielkonflikte" tone="warn"><ul className="list-disc pl-5">{listText(targetConflicts(x))}</ul></SmallCard><SmallCard title="Engpässe" tone="bad"><ul className="list-disc pl-5">{listText(x.calc.deficits.map((r)=>`${r.name}: ${r.bottleneck || "ohne Notiz"}`), "Keine priorisierten Engpässe.")}</ul></SmallCard><SmallCard title="Riskante Annahmen" tone="warn"><ul className="list-disc pl-5">{listText(x.calc.risky.map((a)=>a.text), "Keine riskanten Annahmen markiert.")}</ul></SmallCard></div></Panel>)}</div><Panel title="Vergleichsbericht"><pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">{text}</pre></Panel></>}</div>;
}

function ModuleFrame({ module }) {
  if (module.type === "react") return <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden"><App8 /></div>;
  if (module.type === "nativeReport") return <NativeReport />;
  if (module.type === "nativeCompare") return <NativeCompare />;
  return <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden"><div className="border-b border-slate-200 bg-white p-4 md:p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Kompatibilitätsmodul</div><h2 className="mt-1 text-2xl font-black text-slate-950">{module.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{module.description}</p></div><a className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-100" href={module.path} target="_blank" rel="noreferrer">In neuem Tab öffnen</a></div></div><iframe title={module.title} src={module.path} className="h-[78vh] w-full border-0 bg-white" /></section>;
}

export default function App16() {
  const [activeId, setActiveId] = useState("modellierung");
  const active = modules.find((m) => m.id === activeId) || modules[0];
  const groups = useMemo(() => groupedModules(), []);
  return <main className="min-h-screen bg-slate-100 text-slate-950"><header className="border-b border-slate-800 bg-slate-950 text-white"><div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8"><div className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-bold text-slate-300">KI-Kernel GPT 1.1 · Bericht+ und Vergleich+ nativ</div><div className="mt-4 grid gap-4 lg:grid-cols-[1fr_420px] lg:items-end"><div><h1 className="text-4xl font-black tracking-tight md:text-5xl">Beratungsfähiger Organisationssimulator</h1><p className="mt-3 max-w-4xl text-base leading-7 text-slate-300">Die wichtigsten Output- und Vergleichsfunktionen laufen jetzt nativ in React. Phasen, Beziehungen, Import+ und Beratung bleiben zunächst als integrierte Kompatibilitätsmodule erhalten.</p></div><div className="rounded-3xl border border-white/10 bg-white/5 p-4"><div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Aktives Modul</div><div className="mt-1 text-2xl font-black">{active.title}</div><p className="mt-1 text-sm leading-6 text-slate-300">{active.description}</p></div></div></div></header><div className="mx-auto grid max-w-[1600px] gap-5 px-4 py-5 md:px-8 lg:grid-cols-[290px_1fr]"><aside className="lg:sticky lg:top-4 lg:self-start"><nav className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm"><div className="px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">Module</div><div className="space-y-4">{groups.map((group)=><div key={group.name}><div className="px-3 pb-1 text-xs font-black uppercase tracking-wide text-slate-500">{group.name}</div><div className="space-y-1">{group.items.map((module)=><button key={module.id} onClick={()=>setActiveId(module.id)} className={`w-full rounded-2xl px-3 py-3 text-left text-sm font-extrabold transition ${activeId===module.id?"bg-slate-950 text-white shadow-sm":"text-slate-700 hover:bg-slate-100"}`}><div>{module.title}</div><div className={`mt-1 text-xs font-semibold leading-4 ${activeId===module.id?"text-slate-300":"text-slate-400"}`}>{module.description}</div></button>)}</div></div>)}</div></nav><section className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><div className="font-black">Konsolidierungsstand</div><p className="mt-1">Bericht+ und Vergleich+ sind nativ integriert. Nächster Migrationsschritt: Phasen und Beziehungen als native Szenariobestandteile.</p></section></aside><section className="min-w-0"><ModuleFrame module={active} /></section></div></main>;
}
