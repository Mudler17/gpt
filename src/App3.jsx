import React, { useEffect, useMemo, useState } from "react";

const uid = () => Math.random().toString(36).slice(2, 10);
const STORAGE_KEY = "ki-kernel-scenarios-v2";

function criterionText(key, value) {
  const v = Number(value);
  const data = {
    speed: ["Sehr langsam: lange Klärung vor Bewegung.", "Eher langsam: Beteiligung und Sorgfalt bremsen, erhöhen aber Anschlussfähigkeit.", "Mittleres Tempo: Klärung und Umsetzung halten sich die Waage.", "Eher schnell: rascher Start mit Kommunikationsbedarf.", "Sehr schnell: hoher Umsetzungsschub durch klare Entscheidung."],
    acceptance: ["Sehr geringe Akzeptanz: Vorgehen wirkt fremd oder belastend.", "Geringe Akzeptanz: deutliche Beteiligungs- und Vertrauensrisiken.", "Mittlere Akzeptanz: Zustimmung hängt stark von Kommunikation ab.", "Hohe Akzeptanz: Vorgehen ist anschlussfähig, wenn Grenzen klar bleiben.", "Sehr hohe Akzeptanz: passt gut zu Bedarf und Belastungslage."],
    control: ["Sehr geringe Kontrolle: Governance kaum steuerbar.", "Geringe Kontrolle: relevante Lücken und Nachsteuerungsbedarf.", "Mittlere Kontrolle: Grundregeln möglich, aber nicht vollständig abgesichert.", "Hohe Kontrolle: Zuständigkeiten und Datenregeln gut steuerbar.", "Sehr hohe Kontrolle: Governance und Qualitätssicherung klar angelegt."],
    innovation: ["Sehr gering: Lernen und Erprobung stark begrenzt.", "Gering: wenige neue Praxisimpulse.", "Mittel: Raum für Lernen, aber keine breite Erprobung.", "Hoch: praxisnahe Experimente wahrscheinlich.", "Sehr hoch: viele Use Cases und organisationales Lernen."],
    risk: ["Sehr gering: wenige erkennbare Nebenwirkungen.", "Gering: wichtigste Risiken wirken beherrschbar.", "Mittel: Nebenwirkungen müssen aktiv moderiert werden.", "Hoch: Widerstand oder Governance-Probleme wahrscheinlich.", "Sehr hoch: Vertrauen, Beteiligung oder Datenschutz können destabilisiert werden."]
  };
  return data[key]?.[Math.max(1, Math.min(5, v)) - 1] || "Bitte Bewertung begründen.";
}

const makeStrategy = (name, speed, acceptance, control, innovation, risk) => ({
  id: uid(), name,
  description: name.includes("Governance") ? "Zuerst Regeln, Datenklassen, Freigabewege und Schulung klären." : "Freiwillige Piloten starten und daraus Regeln, Beispiele und Schulungen ableiten.",
  speed, speedText: criterionText("speed", speed),
  acceptance, acceptanceText: criterionText("acceptance", acceptance),
  control, controlText: criterionText("control", control),
  innovation, innovationText: criterionText("innovation", innovation),
  risk, riskText: criterionText("risk", risk),
  conditions: "Voraussetzungen prüfen und mit Beteiligten validieren.",
  failureMode: "Scheitert, wenn Annahmen nicht geprüft oder Nebenwirkungen ignoriert werden.",
  decisionSignal: "Wählen, wenn diese Strategie am besten zur Ressourcenlage passt."
});

const initialScenario = {
  context: {
    title: "KI-Richtlinie in einer dezentralen Organisation einführen",
    domain: "Bildungs- und Sozialunternehmen",
    decisionQuestion: "Wie kann die KI-Richtlinie so eingeführt werden, dass Sicherheit, Beteiligung und praktische Nutzbarkeit zusammenkommen?",
    goal: "Ein tragfähiges Vorgehen für Kommunikation, Beteiligung, Pilotierung und Qualifizierung entwickeln.",
    boundaries: "Keine personenbezogenen Profile. Simulation nur mit Rollen, Archetypen und anonymisierten Szenarien."
  },
  assumptions: [
    { id: uid(), text: "Mitarbeitende sind interessiert, aber durch Arbeitsbelastung und Datenschutzfragen verunsichert.", source: "Beratungshypothese", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "Hypothese" },
    { id: uid(), text: "Führungskräfte brauchen klare Entscheidungs- und Kommunikationshilfen.", source: "Workshop-Erfahrung", evidence: "mittel", uncertainty: "niedrig", sensitivity: "intern", sourceStatus: "Hypothese" }
  ],
  personas: [
    { id: uid(), name: "Skeptische Fachkraft", role: "Operative Praxis", stance: "vorsichtig-kritisch", influence: 4, affectedness: 5, trust: 3, aiLiteracy: 2, riskSense: 5, changeEnergy: 2, informalRole: "Meinungsgeber*in", conflictStyle: "kritisch nachfragend", trigger: "unklare Datenschutz- oder Kontrollfragen", learningNeed: "Sicherheit, Grenzen und Beispiele", communicationNeed: "klare Zusicherung: keine Leistungsbewertung durch KI" },
    { id: uid(), name: "Pragmatische Teamleitung", role: "Mittlere Führung", stance: "offen, aber überlastet", influence: 5, affectedness: 4, trust: 4, aiLiteracy: 3, riskSense: 4, changeEnergy: 3, informalRole: "Übersetzer*in", conflictStyle: "ausgleichend-pragmatisch", trigger: "zusätzliche Aufgaben ohne Entlastung", learningNeed: "Entscheidungshilfen", communicationNeed: "kurz, konkret, belastungssensibel" },
    { id: uid(), name: "Datenschutzrolle", role: "Governance", stance: "prüfend und begrenzend", influence: 4, affectedness: 3, trust: 3, aiLiteracy: 4, riskSense: 5, changeEnergy: 3, informalRole: "Stoppsignal", conflictStyle: "regel- und risikoorientiert", trigger: "Uploads und personenbezogene Daten", learningNeed: "Datenflüsse", communicationNeed: "frühzeitig einbinden" }
  ],
  resources: [
    { id: uid(), name: "Vertrauen", type: "sozial", current: 3, target: 4, direction: "high_good", trend: "stabil", bottleneck: "unklare Absichten oder Kontrollsorgen", owner: "Leitung / Moderation" },
    { id: uid(), name: "Klarheit", type: "kognitiv", current: 3, target: 5, direction: "high_good", trend: "steigend", bottleneck: "abstrakte Kommunikation", owner: "Projektleitung" },
    { id: uid(), name: "Zeitdruck", type: "operativ", current: 4, target: 2, direction: "low_good", trend: "steigend", bottleneck: "enge Fristen", owner: "Projektsteuerung" },
    { id: uid(), name: "Konfliktspannung", type: "sozial", current: 3, target: 2, direction: "low_good", trend: "steigend", bottleneck: "ungeklärte Interessen", owner: "Moderation" }
  ],
  interventions: [
    { id: uid(), name: "Vorab-FAQ Datenschutz und KI-Grenzen", timing: "vor Workshop", target: "Vertrauen und Sicherheit", benefit: "reduziert diffuse Unsicherheit", sideEffect: "kann als bürokratische Bremse wirken", effort: "mittel" },
    { id: uid(), name: "Pilotgruppe mit freiwilligen Use Cases", timing: "nach Erstinformation", target: "Praxisnutzen sichtbar machen", benefit: "erzeugt konkrete Beispiele und Akzeptanz", sideEffect: "kann als Eliteprojekt wahrgenommen werden", effort: "mittel" }
  ],
  strategies: [makeStrategy("A Governance-first", 2, 3, 5, 3, 2), makeStrategy("B Pilot-first", 4, 4, 3, 5, 3)],
  openQuestions: [], warnings: []
};

function safeArray(x) { return Array.isArray(x) ? x : []; }
function normalizeDraft(draft) {
  const d = draft || {};
  return {
    context: { ...initialScenario.context, ...(d.context || {}) },
    assumptions: safeArray(d.assumptions).map(x => ({ id: uid(), source: "Import", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "abgeleitet", ...x })),
    personas: safeArray(d.personas).map(x => ({ id: uid(), influence: 3, affectedness: 3, trust: 3, aiLiteracy: 3, riskSense: 3, changeEnergy: 3, ...x })),
    resources: safeArray(d.resources).map(x => ({ id: uid(), current: 3, target: 4, direction: "high_good", trend: "unklar", ...x })),
    interventions: safeArray(d.interventions).map(x => ({ id: uid(), effort: "mittel", ...x })),
    strategies: safeArray(d.strategies).map(x => ({ id: uid(), speedText: x.speedText || criterionText("speed", x.speed || 3), acceptanceText: x.acceptanceText || criterionText("acceptance", x.acceptance || 3), controlText: x.controlText || criterionText("control", x.control || 3), innovationText: x.innovationText || criterionText("innovation", x.innovation || 3), riskText: x.riskText || criterionText("risk", x.risk || 3), ...x })),
    openQuestions: safeArray(d.openQuestions),
    warnings: safeArray(d.warnings)
  };
}

function avg(list, key) { return list.length ? list.reduce((s, x) => s + Number(x[key] || 0), 0) / list.length : 0; }
function resourceScore(r) { return (r.direction === "low_good" ? 6 - Number(r.current || 1) : Number(r.current || 1)) * 20; }
function resourceGap(r) { return r.direction === "low_good" ? Number(r.current || 1) - Number(r.target || 1) : Number(r.target || 1) - Number(r.current || 1); }
function strategyScore(s) { return Number(s.acceptance || 0) * 3 + Number(s.control || 0) * 3 + Number(s.innovation || 0) * 2 + Number(s.speed || 0) - Number(s.risk || 0) * 3; }
function compute(s) {
  const resources = safeArray(s.resources), personas = safeArray(s.personas), assumptions = safeArray(s.assumptions), interventions = safeArray(s.interventions), strategies = safeArray(s.strategies);
  const res = resources.length ? resources.reduce((a, r) => a + resourceScore(r), 0) / resources.length : 60;
  const risky = assumptions.filter(a => a.evidence === "niedrig" || a.uncertainty === "hoch");
  const hasPrivacy = interventions.some(i => /daten|datenschutz|grenze|faq/i.test(`${i.name} ${i.target}`));
  const hasParticipation = interventions.some(i => /einwand|beteilig|freiwillig|workshop/i.test(`${i.name} ${i.target}`));
  const acceptance = Math.round(Math.min(100, 20 + avg(personas, "trust") * 8 + avg(personas, "aiLiteracy") * 3 + avg(personas, "changeEnergy") * 4 + (hasParticipation ? 16 : 0) + res * .15 - risky.length * 4));
  const governance = Math.round(Math.min(100, 30 + avg(personas, "riskSense") * 5 + (hasPrivacy ? 22 : 0) + res * .18));
  const learning = Math.round(Math.min(100, 25 + avg(personas, "aiLiteracy") * 7 + avg(personas, "changeEnergy") * 5 + interventions.length * 5));
  const risk = Math.round(Math.max(0, 100 - (acceptance * .35 + governance * .4 + learning * .15 + res * .1)));
  const bestStrategy = [...strategies].sort((a,b)=>strategyScore(b)-strategyScore(a))[0];
  return { acceptance, governance, learning, resources: Math.round(res), risk, risky, deficits: resources.filter(r=>resourceGap(r)>0), bestStrategy };
}
function loadSaved() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function persistSaved(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

function Card({ children, className = "" }) { return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>; }
function Button({ children, onClick, dark=false, disabled=false }) { return <button disabled={disabled} onClick={onClick} className={`${dark ? "bg-slate-900 text-white" : "bg-white text-slate-800 border border-slate-200"} rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50`}>{children}</button>; }
function Field({ label, value, onChange, area=false }) { const c="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-100"; return <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>{area?<textarea className={`${c} min-h-24`} value={value||""} onChange={e=>onChange(e.target.value)}/>:<input className={c} value={value||""} onChange={e=>onChange(e.target.value)}/>}</label>; }
function Range({ label, value, onChange }) { return <label><div className="mb-1 flex justify-between text-sm"><b>{label}</b><span>{value||3}/5</span></div><input type="range" min="1" max="5" value={value||3} onChange={e=>onChange(Number(e.target.value))} className="w-full accent-slate-900"/></label>; }
function Mini({title,text}){return <div className="rounded-xl bg-white p-3"><b>{title}</b><p className="mt-2 whitespace-pre-line text-sm text-slate-600">{text || "—"}</p></div>}

function ImportPanel({ setState, setTab }) {
  const [text,setText]=useState("");
  const [draft,setDraft]=useState(null);
  const [documentType,setDocumentType]=useState("Konzept");
  const [analysisMode,setAnalysisMode]=useState("beratend");
  const [status,setStatus]=useState("idle");
  const [err,setErr]=useState("");
  const [fileInfo,setFileInfo]=useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(""); setFileInfo(`${file.name} (${Math.round(file.size/1024)} KB)`);
    const name = file.name.toLowerCase();
    if (!(name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".json") || file.type.startsWith("text/"))) {
      setErr("Dieser Upload Light liest aktuell nur TXT, MD, JSON oder reine Textdateien. DOCX/PDF folgen später serverseitig.");
      return;
    }
    if (file.size > 1024 * 1024) { setErr("Datei ist größer als 1 MB. Bitte kürzen."); return; }
    const content = await file.text();
    setText(content);
  }

  async function runImport(){
    setStatus("loading"); setErr("");
    try{
      const res=await fetch("/api/import-scenario",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,documentType,analysisMode})});
      if(!res.ok) throw new Error(await res.text());
      const raw = await res.json();
      setDraft(normalizeDraft(raw));
      setStatus("done");
    }catch(e){ setErr(String(e.message||e)); setStatus("error"); }
  }

  function acceptDraft() {
    if (!draft) return;
    setState(draft);
    setDraft(null);
    setTab("Ausgangslage");
  }

  return <Card>
    <h2 className="text-xl font-bold">Import Light: Szenario aus Konzept erstellen</h2>
    <p className="mt-1 text-sm text-slate-600">Füge Text ein oder lade eine Textdatei hoch. Der Entwurf wird erst nach deiner Bestätigung in das Szenario übernommen.</p>
    <div className="mt-4 rounded-2xl border bg-amber-50 p-4 text-sm text-amber-900">Upload Light: TXT, MD, JSON und reine Textdateien. DOCX/PDF brauchen eine serverseitige Extraktionsstufe und sind noch nicht aktiv.</div>
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      <label className="block"><span className="mb-1 block text-sm font-semibold">Dokumenttyp</span><select className="w-full rounded-xl border p-2" value={documentType} onChange={e=>setDocumentType(e.target.value)}>{["Konzept","Projektantrag","Workshopplan","Richtlinie","Protokoll","Strategiepapier","Schulungskonzept","Sonstiges"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">Analysemodus</span><select className="w-full rounded-xl border p-2" value={analysisMode} onChange={e=>setAnalysisMode(e.target.value)}>{["vorsichtig","beratend","pre-mortem"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">Datei hochladen</span><input className="w-full rounded-xl border bg-white p-2 text-sm" type="file" accept=".txt,.md,.json,text/*" onChange={handleFile}/></label>
    </div>
    {fileInfo && <div className="mt-2 text-xs text-slate-500">Geladen: {fileInfo}</div>}
    <textarea value={text} onChange={e=>setText(e.target.value)} className="mt-4 min-h-64 w-full rounded-2xl border p-4 text-sm" placeholder="Konzept hier einfügen. Bitte keine echten personenbezogenen Profile oder vertraulichen Klientendaten einfügen."/>
    <div className="mt-3 flex flex-wrap gap-2"><Button dark onClick={runImport} disabled={status==="loading"||text.trim().length<80}>{status==="loading"?"Analysiere ...":"Szenarioentwurf erzeugen"}</Button>{draft&&<Button onClick={()=>setDraft(null)}>Entwurf verwerfen</Button>}</div>
    {err&&<div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{err}</div>}
    {draft&&<div className="mt-5 rounded-2xl border bg-slate-50 p-4"><h3 className="text-lg font-bold">Review vor Übernahme</h3><p className="text-sm text-slate-600">Dieser Entwurf stammt aus dem Import. Mit „Übernehmen“ wird das aktuelle Szenario ersetzt und du landest in „Ausgangslage“.</p><div className="mt-3 flex flex-wrap gap-2">{[`Annahmen ${draft.assumptions.length}`,`Personas ${draft.personas.length}`,`Ressourcen ${draft.resources.length}`,`Interventionen ${draft.interventions.length}`,`Strategien ${draft.strategies.length}`].map(c=><span key={c} className="rounded-full bg-white px-3 py-1 text-sm font-semibold">{c}</span>)}</div><div className="mt-4 grid gap-4 lg:grid-cols-2"><Mini title="Ausgangslage" text={`${draft.context.title}\n${draft.context.decisionQuestion}`}/><Mini title="Offene Fragen" text={(draft.openQuestions||[]).join("\n")}/><Mini title="Warnungen" text={(draft.warnings||[]).join("\n")}/><Mini title="Erste Annahmen" text={draft.assumptions.slice(0,5).map(a=>`${a.sourceStatus||"abgeleitet"}: ${a.text}`).join("\n")}/></div><div className="mt-4 flex gap-2"><Button dark onClick={acceptDraft}>Entwurf in Szenario übernehmen</Button><Button onClick={()=>setDraft(null)}>Nicht übernehmen</Button></div></div>}
  </Card>;
}

function Dashboard({ sim }) { const rows=[["Akzeptanz",sim.acceptance],["Governance",sim.governance],["Ressourcen",sim.resources],["Lernfähigkeit",sim.learning],["Restrisiko",sim.risk]]; return <Card><h2 className="text-xl font-bold">Dashboard</h2><div className="mt-4 grid gap-3 md:grid-cols-5">{rows.map(([k,v])=><div className="rounded-2xl border bg-slate-50 p-4" key={k}><div className="text-sm font-semibold text-slate-500">{k}</div><div className="text-3xl font-bold">{v}</div><div className="mt-2 h-2 rounded bg-slate-200"><div className="h-2 rounded bg-slate-900" style={{width:`${Math.max(0,Math.min(100,v))}%`}}/></div></div>)}</div><p className="mt-4 text-sm text-slate-600">Empfohlene Strategie: <b>{sim.bestStrategy?.name||"keine"}</b></p></Card> }
function Context({state,setState}){const u=(k,v)=>setState(s=>({...s,context:{...s.context,[k]:v}}));return <Card><h2 className="text-xl font-bold">Ausgangslage</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Titel" value={state.context.title} onChange={v=>u("title",v)}/><Field label="Domäne" value={state.context.domain} onChange={v=>u("domain",v)}/><div className="md:col-span-2"><Field area label="Entscheidungsfrage" value={state.context.decisionQuestion} onChange={v=>u("decisionQuestion",v)}/></div><Field area label="Ziel" value={state.context.goal} onChange={v=>u("goal",v)}/><Field area label="Grenzen" value={state.context.boundaries} onChange={v=>u("boundaries",v)}/></div></Card>}
function ListEditor({title,items,setItems,fields,blank}){const upd=(itemId,k,v)=>setItems(items.map(x=>x.id===itemId?{...x,[k]:v}:x));return <Card><div className="flex justify-between"><h2 className="text-xl font-bold">{title}</h2><Button dark onClick={()=>setItems([...items,{id:uid(),...blank}])}>+ Hinzufügen</Button></div><div className="mt-4 space-y-4">{items.map(item=><div className="rounded-2xl border bg-slate-50 p-4" key={item.id}><div className="grid gap-3 md:grid-cols-2">{fields.map(f=> f.type==="range"?<Range key={f.key} label={f.label} value={item[f.key]||3} onChange={v=>upd(item.id,f.key,v)}/>:<Field key={f.key} area={f.area} label={f.label} value={item[f.key]||""} onChange={v=>upd(item.id,f.key,v)}/>)}</div><button className="mt-3 text-sm font-bold text-rose-700" onClick={()=>setItems(items.filter(x=>x.id!==item.id))}>löschen</button></div>)}</div></Card>}
function Strategies({state,setState}){const upd=(itemId,k,v)=>setState(s=>({...s,strategies:s.strategies.map(st=>st.id===itemId?{...st,[k]:v}:st)}));const updCrit=(itemId,k,tk,v)=>setState(s=>({...s,strategies:s.strategies.map(st=>st.id===itemId?{...st,[k]:v,[tk]:criterionText(k,v)}:st)}));return <Card><h2 className="text-xl font-bold">Strategien</h2><p className="text-sm text-slate-600">Slider ändern automatisch die Begründungstexte; danach kannst du sie überschreiben.</p><div className="mt-4 space-y-4">{state.strategies.map(st=><div className="rounded-2xl border bg-slate-50 p-4" key={st.id}><Field label="Name" value={st.name} onChange={v=>upd(st.id,"name",v)}/><div className="mt-3"><Field area label="Grundidee" value={st.description} onChange={v=>upd(st.id,"description",v)}/></div><div className="mt-3 grid gap-3 lg:grid-cols-5">{[["speed","Tempo","speedText"],["acceptance","Akzeptanz","acceptanceText"],["control","Kontrolle","controlText"],["innovation","Innovation","innovationText"],["risk","Risiko","riskText"]].map(([k,l,tk])=><div className="rounded-xl border bg-white p-3" key={k}><Range label={l} value={st[k]||3} onChange={v=>updCrit(st.id,k,tk,v)}/><textarea className="mt-2 min-h-24 w-full rounded-xl border bg-slate-50 p-2 text-xs" value={st[tk]||""} onChange={e=>upd(st.id,tk,e.target.value)}/></div>)}</div><div className="mt-3 grid gap-3 md:grid-cols-3"><Field area label="Bedingungen" value={st.conditions} onChange={v=>upd(st.id,"conditions",v)}/><Field area label="Scheiternsmodus" value={st.failureMode} onChange={v=>upd(st.id,"failureMode",v)}/><Field area label="Entscheidungssignal" value={st.decisionSignal} onChange={v=>upd(st.id,"decisionSignal",v)}/></div></div>)}</div></Card>}
function Report({state,sim}){const [status,setStatus]=useState("local"),[gpt,setGpt]=useState(null);async function run(){setStatus("loading");try{const r=await fetch("/api/simulate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({state})});if(!r.ok)throw new Error(await r.text());setGpt(await r.json());setStatus("done")}catch(e){setStatus("error")}}const sections=gpt?Object.entries(gpt):[["Executive Summary",`${state.context.title}\nAkzeptanz ${sim.acceptance}, Governance ${sim.governance}, Ressourcen ${sim.resources}, Restrisiko ${sim.risk}.`],["Ressourcenengpässe",sim.deficits.map(r=>`${r.name}: ${r.bottleneck}`).join("\n")||"keine"],["Riskante Annahmen",sim.risky.map(a=>a.text).join("\n")||"keine"],["Strategie",sim.bestStrategy?.name||"keine"]];return <Card><div className="flex justify-between"><h2 className="text-xl font-bold">Report</h2><div className="flex gap-2"><Button onClick={run}>GPT-Report</Button><Button dark onClick={()=>navigator.clipboard?.writeText(sections.map(([a,b])=>`${a}\n${b}`).join("\n\n"))}>Kopieren</Button></div></div><p className="mt-2 text-sm text-slate-500">Status: {status}</p><div className="mt-4 grid gap-3 md:grid-cols-2">{sections.map(([k,v])=><div className="rounded-2xl border bg-slate-50 p-4" key={k}><b>{k}</b><p className="mt-2 whitespace-pre-line text-sm">{String(v)}</p></div>)}</div></Card>}
function Storage({state,setState,saved,setSaved}){const [name,setName]=useState(state.context.title);function save(){const item={id:uid(),name:name||state.context.title,date:new Date().toISOString(),state};const next=[item,...saved];setSaved(next);persistSaved(next)}function load(item){setState(item.state)}function duplicate(item){const copy={id:uid(),name:item.name+" Kopie",date:new Date().toISOString(),state:item.state};const next=[copy,...saved];setSaved(next);persistSaved(next)}function del(itemId){const next=saved.filter(x=>x.id!==itemId);setSaved(next);persistSaved(next)}return <Card><h2 className="text-xl font-bold">Speichern und Laden</h2><div className="mt-4 flex gap-2"><input className="flex-1 rounded-xl border p-2" value={name} onChange={e=>setName(e.target.value)}/><Button dark onClick={save}>Aktuelles Szenario speichern</Button></div><div className="mt-4 space-y-3">{saved.map(item=><div className="rounded-2xl border bg-slate-50 p-4" key={item.id}><b>{item.name}</b><div className="text-xs text-slate-500">{new Date(item.date).toLocaleString()}</div><div className="mt-2 flex gap-2"><Button onClick={()=>load(item)}>Laden</Button><Button onClick={()=>duplicate(item)}>Duplizieren</Button><Button onClick={()=>del(item.id)}>Löschen</Button></div></div>)}</div></Card>}
function Compare({saved}){const [a,setA]=useState(""),[b,setB]=useState("");const A=saved.find(x=>x.id===a)?.state,B=saved.find(x=>x.id===b)?.state;const ca=A?compute(A):null,cb=B?compute(B):null;return <Card><h2 className="text-xl font-bold">Vergleich</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><select className="rounded-xl border p-2" value={a} onChange={e=>setA(e.target.value)}><option value="">Simulation A wählen</option>{saved.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><select className="rounded-xl border p-2" value={b} onChange={e=>setB(e.target.value)}><option value="">Simulation B wählen</option>{saved.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>{ca&&cb&&<div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Kriterium</th><th>A</th><th>B</th><th>Delta</th></tr></thead><tbody>{[["Akzeptanz","acceptance"],["Governance","governance"],["Ressourcen","resources"],["Lernfähigkeit","learning"],["Restrisiko","risk"]].map(([l,k])=><tr className="border-t" key={k}><td className="p-2 font-semibold">{l}</td><td>{ca[k]}</td><td>{cb[k]}</td><td>{cb[k]-ca[k]}</td></tr>)}</tbody></table><div className="mt-4 grid gap-3 md:grid-cols-2"><Mini title="Neue/andere Annahmen B" text={B.assumptions.map(x=>x.text).filter(t=>!A.assumptions.map(y=>y.text).includes(t)).join("\n")||"keine"}/><Mini title="Strategien" text={`A: ${ca.bestStrategy?.name||"-"}\nB: ${cb.bestStrategy?.name||"-"}`}/></div></div>}</Card>}

const tabs=["Dashboard","Import","Ausgangslage","Annahmen","Personas","Ressourcen","Interventionen","Strategien","Report","Speicher","Vergleich"];
export default function App(){const [state,setState]=useState(initialScenario);const [tab,setTab]=useState("Dashboard");const [saved,setSaved]=useState([]);useEffect(()=>setSaved(loadSaved()),[]);const sim=useMemo(()=>compute(state),[state]);const set=(key,val)=>setState(s=>({...s,[key]:val}));const views={Dashboard:<Dashboard sim={sim}/>,Import:<ImportPanel setState={setState} setTab={setTab}/>,Ausgangslage:<Context state={state} setState={setState}/>,Annahmen:<ListEditor title="Annahmen" items={state.assumptions} setItems={v=>set("assumptions",v)} blank={{text:"",source:"manuell",evidence:"niedrig",uncertainty:"mittel",sensitivity:"intern"}} fields={[{key:"text",label:"Annahme",area:true},{key:"source",label:"Quelle"},{key:"evidence",label:"Evidenz"},{key:"uncertainty",label:"Unsicherheit"},{key:"sensitivity",label:"Sensibilität"},{key:"sourceStatus",label:"Status"}]}/>,Personas:<ListEditor title="Personas" items={state.personas} setItems={v=>set("personas",v)} blank={{name:"Neue Rolle",role:"Stakeholder",stance:"unklar",influence:3,affectedness:3,trust:3,aiLiteracy:3,riskSense:3,changeEnergy:3}} fields={[{key:"name",label:"Name"},{key:"role",label:"Rolle"},{key:"stance",label:"Haltung"},{key:"influence",label:"Einfluss",type:"range"},{key:"affectedness",label:"Betroffenheit",type:"range"},{key:"trust",label:"Vertrauen",type:"range"},{key:"aiLiteracy",label:"KI-Kompetenz",type:"range"},{key:"riskSense",label:"Risikoempfinden",type:"range"},{key:"changeEnergy",label:"Veränderungsenergie",type:"range"},{key:"trigger",label:"Trigger",area:true},{key:"communicationNeed",label:"Kommunikationsbedarf",area:true}]}/>,Ressourcen:<ListEditor title="Ressourcen" items={state.resources} setItems={v=>set("resources",v)} blank={{name:"Neue Ressource",type:"sozial",current:3,target:4,direction:"high_good",trend:"stabil",bottleneck:"",owner:""}} fields={[{key:"name",label:"Ressource"},{key:"type",label:"Typ"},{key:"direction",label:"Logik"},{key:"trend",label:"Trend"},{key:"current",label:"Aktuell",type:"range"},{key:"target",label:"Ziel",type:"range"},{key:"bottleneck",label:"Engpass",area:true},{key:"owner",label:"Beobachten / Verantwortlich",area:true}]}/>,Interventionen:<ListEditor title="Interventionen" items={state.interventions} setItems={v=>set("interventions",v)} blank={{name:"Neue Intervention",timing:"offen",target:"",benefit:"",sideEffect:"",effort:"mittel"}} fields={[{key:"name",label:"Name"},{key:"timing",label:"Zeitpunkt"},{key:"target",label:"Ziel"},{key:"benefit",label:"Nutzen",area:true},{key:"sideEffect",label:"Nebenwirkung",area:true},{key:"effort",label:"Aufwand"}]}/>,Strategien:<Strategies state={state} setState={setState}/>,Report:<Report state={state} sim={sim}/>,Speicher:<Storage state={state} setState={setState} saved={saved} setSaved={setSaved}/>,Vergleich:<Compare saved={saved}/>};return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8"><div className="mx-auto max-w-7xl space-y-5"><header className="rounded-3xl bg-slate-950 p-8 text-white"><div className="mb-3 inline-flex rounded-full border border-white/20 px-3 py-1 text-sm">KI-Kernel GPT 0.3</div><h1 className="text-4xl font-bold">Szenarioentwurf, Upload Light, Simulation, Speicher und Vergleich</h1><p className="mt-3 max-w-3xl text-slate-300">Konzept einfügen oder Textdatei hochladen, Szenarioentwurf prüfen, übernehmen, nachjustieren, simulieren, speichern und vergleichen.</p><div className="mt-5 flex gap-3"><Button onClick={()=>setState(initialScenario)}>Beispiel neu laden</Button><a className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold" href="/hilfe.html" target="_blank" rel="noreferrer">Hilfe öffnen</a></div></header><nav className="sticky top-2 z-10 overflow-x-auto rounded-2xl border bg-white/90 p-2 shadow-sm backdrop-blur"><div className="flex min-w-max gap-2">{tabs.map(t=><button key={t} onClick={()=>setTab(t)} className={`rounded-xl px-3 py-2 text-sm font-bold ${tab===t?"bg-slate-900 text-white":"text-slate-600 hover:bg-slate-100"}`}>{t}</button>)}<a href="/hilfe.html" target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Hilfe</a></div></nav>{views[tab]}<footer className="rounded-2xl border bg-white p-4 text-xs text-slate-500">Speicherung erfolgt aktuell lokal im Browser. Originaldokumente werden nicht serverseitig gespeichert. Keine echten personenbezogenen Profile verwenden.</footer></div></main>}
