import React, { useMemo, useState } from "react";

const newId = () => Math.random().toString(36).slice(2, 10);

const personaTemplates = [
  { name: "Skeptische Fachkraft", role: "Operative Praxis", stance: "vorsichtig-kritisch", influence: 4, affectedness: 5, trust: 3, aiLiteracy: 2, riskSense: 5, changeEnergy: 2, informalRole: "Meinungsgeber*in im Team", conflictStyle: "kritisch nachfragend", trigger: "unklare Datenschutz- oder Kontrollfragen", learningNeed: "Sicherheit, Grenzen und konkrete Beispiele", communicationNeed: "klare Zusicherung: keine Leistungsbewertung durch KI" },
  { name: "Pragmatische Teamleitung", role: "Mittlere Führung", stance: "offen, aber überlastet", influence: 5, affectedness: 4, trust: 4, aiLiteracy: 3, riskSense: 4, changeEnergy: 3, informalRole: "Übersetzer*in zwischen Strategie und Alltag", conflictStyle: "ausgleichend-pragmatisch", trigger: "zusätzliche Aufgaben ohne Entlastung", learningNeed: "Entscheidungshilfen und klare Kommunikationsbausteine", communicationNeed: "kurz, konkret, belastungssensibel" },
  { name: "KI-affine Verwaltungskraft", role: "Verwaltung / Support", stance: "experimentierfreudig", influence: 3, affectedness: 4, trust: 4, aiLiteracy: 5, riskSense: 3, changeEnergy: 5, informalRole: "frühe Anwender*in", conflictStyle: "lösungsorientiert", trigger: "zu restriktive Verbote", learningNeed: "Freiräume, Beispiele, klare Freigabegrenzen", communicationNeed: "nicht ausbremsen, sondern sicher ermöglichen" },
  { name: "Datenschutzrolle", role: "Governance", stance: "prüfend und begrenzend", influence: 4, affectedness: 3, trust: 3, aiLiteracy: 4, riskSense: 5, changeEnergy: 3, informalRole: "Stoppsignal und Schutzfunktion", conflictStyle: "regel- und risikoorientiert", trigger: "Uploads, personenbezogene Daten, unklare Anbieter", learningNeed: "Datenflüsse, Anbieter, Zwecke, Löschlogik", communicationNeed: "frühzeitig einbinden, nicht nachträglich absegnen lassen" },
  { name: "MAV / Interessenvertretung", role: "Mitarbeitendenvertretung", stance: "schutzorientiert-prüfend", influence: 5, affectedness: 4, trust: 3, aiLiteracy: 3, riskSense: 5, changeEnergy: 3, informalRole: "Legitimations- und Frühwarnrolle", conflictStyle: "interessenklärend", trigger: "fertige Entscheidungen ohne Beteiligung", learningNeed: "Beteiligungsrechte, Grenzen, Schutz vor Verhaltenskontrolle", communicationNeed: "früh, transparent, mit echter Gestaltungsmöglichkeit" },
  { name: "Qualitätsmanagement", role: "QM / Prozesssteuerung", stance: "strukturierend", influence: 4, affectedness: 3, trust: 4, aiLiteracy: 4, riskSense: 4, changeEnergy: 4, informalRole: "Dokumentations- und Prozessanker", conflictStyle: "klärend-systematisch", trigger: "unklare Zuständigkeiten und nicht dokumentierte Abweichungen", learningNeed: "Nachweislogik, Review-Prozesse, Prozessschnittstellen", communicationNeed: "konkrete Verantwortlichkeiten und überprüfbare Standards" }
];

const resourceTemplates = [
  { name: "Vertrauen", type: "sozial", current: 3, target: 4, direction: "high_good", trend: "stabil", bottleneck: "unklare Absichten oder Kontrollsorgen", owner: "Leitung / Moderation" },
  { name: "Klarheit", type: "kognitiv", current: 3, target: 5, direction: "high_good", trend: "steigend", bottleneck: "abstrakte Kommunikation", owner: "Projektleitung" },
  { name: "Aufmerksamkeit", type: "kognitiv", current: 3, target: 4, direction: "high_good", trend: "fallend", bottleneck: "Informationsüberlastung", owner: "Moderation" },
  { name: "Energie", type: "emotional", current: 3, target: 4, direction: "high_good", trend: "stabil", bottleneck: "Erschöpfung und Parallelbelastung", owner: "Führung" },
  { name: "Zeitdruck", type: "operativ", current: 4, target: 2, direction: "low_good", trend: "steigend", bottleneck: "enge Fristen", owner: "Projektsteuerung" },
  { name: "Konfliktspannung", type: "sozial", current: 3, target: 2, direction: "low_good", trend: "steigend", bottleneck: "ungeklärte Interessen", owner: "Moderation" },
  { name: "psychologische Sicherheit", type: "sozial", current: 3, target: 4, direction: "high_good", trend: "stabil", bottleneck: "Scheinkonsens oder dominante Stimmen", owner: "Moderation / Leitung" }
];

const start = {
  context: {
    title: "KI-Richtlinie in einer dezentralen Organisation einführen",
    domain: "Bildungs- und Sozialunternehmen",
    decisionQuestion: "Wie kann die KI-Richtlinie so eingeführt werden, dass Sicherheit, Beteiligung und praktische Nutzbarkeit zusammenkommen?",
    goal: "Ein tragfähiges Vorgehen für Kommunikation, Beteiligung, Pilotierung und Qualifizierung entwickeln.",
    boundaries: "Keine personenbezogenen Profile. Simulation nur mit Rollen, Archetypen und anonymisierten Szenarien."
  },
  assumptions: [
    { id: newId(), text: "Mitarbeitende sind interessiert, aber durch Arbeitsbelastung und Datenschutzfragen verunsichert.", source: "Beratungshypothese", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern" },
    { id: newId(), text: "Führungskräfte brauchen zuerst klare Entscheidungs- und Kommunikationshilfen.", source: "Workshop-Erfahrung", evidence: "mittel", uncertainty: "niedrig", sensitivity: "intern" },
    { id: newId(), text: "Eine reine Top-down-Kommunikation würde als zusätzliche Kontrolle wahrgenommen werden.", source: "Pre-Mortem", evidence: "niedrig", uncertainty: "hoch", sensitivity: "intern" }
  ],
  personas: personaTemplates.slice(0, 4).map((p) => ({ id: newId(), ...p })),
  resources: resourceTemplates.slice(0, 6).map((r) => ({ id: newId(), ...r })),
  interventions: [
    { id: newId(), name: "Vorab-FAQ Datenschutz und KI-Grenzen", timing: "vor Workshop", target: "Vertrauen und Sicherheit", benefit: "reduziert diffuse Unsicherheit", sideEffect: "kann als bürokratische Bremse wirken", effort: "mittel" },
    { id: newId(), name: "Pilotgruppe mit freiwilligen Use Cases", timing: "nach Erstinformation", target: "Praxisnutzen sichtbar machen", benefit: "erzeugt konkrete Beispiele und Akzeptanz", sideEffect: "kann als Eliteprojekt wahrgenommen werden", effort: "mittel" },
    { id: newId(), name: "Einwandrunde vor Entscheidung", timing: "im Workshop", target: "Scheinkonsens vermeiden", benefit: "legitimiert Kritik und verbessert Entscheidungsqualität", sideEffect: "verlängert die Klärungsphase", effort: "niedrig" }
  ],
  strategies: [
    { id: newId(), name: "A Governance-first", description: "Zuerst Regeln, Datenklassen, Freigabewege und Schulung klären; danach Toolnutzung erweitern.", speed: 2, speedText: "Langsamer Start durch Vorabklärung.", acceptance: 3, acceptanceText: "Sicherheit hilft, kann aber abstrakt wirken.", control: 5, controlText: "Hohe Kontrolle durch klare Datenklassen und Freigabewege.", innovation: 3, innovationText: "Innovation wird geordnet ermöglicht.", risk: 2, riskText: "Geringeres Datenschutzrisiko, aber Bürokratiegefahr.", conditions: "Sinnvoll bei hoher Unsicherheit und Schutzbedarf.", failureMode: "Scheitert, wenn Governance als Verhinderung erlebt wird.", decisionSignal: "Wählen, wenn Datenschutz und Vertrauen vor Tempo gehen." },
    { id: newId(), name: "B Pilot-first", description: "Freiwillige Piloten starten, daraus Regeln, Beispiele und Schulungen ableiten.", speed: 4, speedText: "Schneller Einstieg über konkrete Praxisfälle.", acceptance: 4, acceptanceText: "Freiwilligkeit und Nutzen erhöhen Akzeptanz.", control: 3, controlText: "Mittlere Kontrolle; Leitplanken sind nötig.", innovation: 5, innovationText: "Sehr hohes Lern- und Innovationspotenzial.", risk: 3, riskText: "Risiko von Eliteprojekt oder Schattenfreigabe.", conditions: "Sinnvoll bei klaren Minimalregeln und guter Auswertung.", failureMode: "Scheitert ohne Datenschutzgrenzen und Rückkopplung.", decisionSignal: "Wählen, wenn konkrete Praxisbeispiele Priorität haben." },
    { id: newId(), name: "C Top-down-Rollout", description: "Leitung entscheidet verbindlich, kommuniziert Linie und gibt Nutzungspfad vor.", speed: 5, speedText: "Sehr schnell durch klare Entscheidung.", acceptance: 2, acceptanceText: "Akzeptanzrisiko bei symbolischer Beteiligung.", control: 3, controlText: "Kontrolle hängt von Verständlichkeit der Regeln ab.", innovation: 3, innovationText: "Tempo kann Innovation beschleunigen, aber oberflächlich bleiben.", risk: 5, riskText: "Hohes Widerstands- und Vertrauensrisiko.", conditions: "Nur bei hoher Dringlichkeit und starkem Vertrauensvorschuss.", failureMode: "Scheitert, wenn es als Machtakt gelesen wird.", decisionSignal: "Wählen, wenn Tempo zwingend ist und Beteiligungsrisiken kompensiert werden." }
  ]
};

function avg(list, key) {
  if (!list.length) return 0;
  return list.reduce((s, item) => s + Number(item[key] || 0), 0) / list.length;
}

function resourceScore(r) {
  const value = r.direction === "low_good" ? 6 - Number(r.current || 1) : Number(r.current || 1);
  return value * 20;
}

function resourceGap(r) {
  return r.direction === "low_good" ? Number(r.current) - Number(r.target) : Number(r.target) - Number(r.current);
}

function strategyScore(s) {
  return s.acceptance * 3 + s.control * 3 + s.innovation * 2 + s.speed - s.risk * 3;
}

function compute(state) {
  const hasPrivacy = state.interventions.some((i) => /daten|datenschutz|grenze|faq/i.test(`${i.name} ${i.target}`));
  const hasParticipation = state.interventions.some((i) => /einwand|beteilig|freiwillig|workshop/i.test(`${i.name} ${i.target}`));
  const resourceStability = state.resources.length ? state.resources.reduce((s, r) => s + resourceScore(r), 0) / state.resources.length : 60;
  const deficits = state.resources.filter((r) => resourceGap(r) > 0).sort((a, b) => resourceGap(b) - resourceGap(a));
  const riskyAssumptions = state.assumptions.filter((a) => a.evidence === "niedrig" || a.uncertainty === "hoch");
  const acceptance = Math.round(Math.min(100, 20 + avg(state.personas, "trust") * 8 + avg(state.personas, "aiLiteracy") * 3 + avg(state.personas, "changeEnergy") * 4 + (hasParticipation ? 16 : 0) + resourceStability * 0.15 - riskyAssumptions.length * 4));
  const governance = Math.round(Math.min(100, 30 + avg(state.personas, "riskSense") * 5 + (hasPrivacy ? 22 : 0) + resourceStability * 0.18));
  const learning = Math.round(Math.min(100, 25 + avg(state.personas, "aiLiteracy") * 7 + avg(state.personas, "changeEnergy") * 5 + state.interventions.length * 5));
  const risk = Math.round(Math.max(0, 100 - (acceptance * 0.35 + governance * 0.4 + learning * 0.15 + resourceStability * 0.1)));
  const bestStrategy = [...state.strategies].sort((a, b) => strategyScore(b) - strategyScore(a))[0];
  return { acceptance, governance, learning, resources: Math.round(resourceStability), risk, deficits, riskyAssumptions, hasPrivacy, hasParticipation, bestStrategy };
}

function buildReport(state, sim, gptReport) {
  if (gptReport) {
    return [
      ["1. Executive Summary", gptReport.executiveSummary],
      ["2. Ausgangslage", gptReport.ausgangslage],
      ["3. Simulationsannahmen", gptReport.simulationsannahmen],
      ["4. Persona- und Stakeholderanalyse", gptReport.stakeholderanalyse],
      ["5. Ressourcen- und Risikolage", gptReport.ressourcenRisikolage],
      ["6. Phasenanalyse", gptReport.phasenanalyse],
      ["7. Konflikt- und Koalitionsmuster", gptReport.konfliktKoalitionsmuster],
      ["8. Kritische Kipppunkte", gptReport.kritischeKipppunkte],
      ["9. Interventionsoptionen", gptReport.interventionsoptionen],
      ["10. Entscheidungsmatrix", gptReport.entscheidungsmatrix],
      ["11. Maßnahmenplan", gptReport.massnahmenplan],
      ["12. Offene Fragen", gptReport.offeneFragen],
      ["13. Datenschutz-/Governance-Hinweise", gptReport.governanceHinweise],
      ["14. Grenzen der Simulation", gptReport.grenzenDerSimulation]
    ];
  }

  const skeptical = state.personas.filter((p) => /kritisch|prüfend|begrenzend|schutz/i.test(`${p.stance} ${p.conflictStyle}`));
  const enabling = state.personas.filter((p) => /offen|experiment|struktur|lösungs|ermöglich/i.test(`${p.stance} ${p.conflictStyle}`));
  const bridges = state.personas.filter((p) => /übersetz|brück|ausgleich|klärend/i.test(`${p.informalRole} ${p.conflictStyle}`));
  const phases = [
    "Vorbereitung: Auftrag, Annahmen, Daten- und Beteiligungsrahmen klären.",
    "Durchführung: Nutzen, Sorgen, Rollen, Grenzen und Einwände sichtbar machen.",
    "Entscheidung: Strategie wählen, Verantwortlichkeiten und Abbruchkriterien festlegen.",
    "Retrospektive: Simulation mit realen Beobachtungen vergleichen und Modell korrigieren."
  ];

  return [
    ["1. Executive Summary", `Die Simulation legt nahe, dass ${state.context.title} nicht als reiner Tool-Rollout, sondern als beteiligungs-, ressourcen- und governancekritischer Veränderungsprozess behandelt werden sollte. Aktuell ist ${sim.bestStrategy?.name || "keine Strategie"} am tragfähigsten. Akzeptanz: ${sim.acceptance}/100, Governance: ${sim.governance}/100, Ressourcen: ${sim.resources}/100, Restrisiko: ${sim.risk}/100.`],
    ["2. Ausgangslage", `Domäne: ${state.context.domain}\nEntscheidungsfrage: ${state.context.decisionQuestion}\nZiel: ${state.context.goal}\nGrenzen: ${state.context.boundaries}`],
    ["3. Simulationsannahmen", state.assumptions.map((a) => `${a.text}\nQuelle: ${a.source}; Evidenz: ${a.evidence}; Unsicherheit: ${a.uncertainty}; Sensibilität: ${a.sensitivity}.`).join("\n\n")],
    ["4. Persona- und Stakeholderanalyse", state.personas.map((p) => `${p.name} (${p.role}): Haltung ${p.stance}; Einfluss ${p.influence}/5; Betroffenheit ${p.affectedness}/5; informelle Rolle: ${p.informalRole}; Trigger: ${p.trigger}; Kommunikationsbedarf: ${p.communicationNeed}.`).join("\n\n")],
    ["5. Ressourcen- und Risikolage", `Akzeptanz ${sim.acceptance}/100, Governance ${sim.governance}/100, Ressourcenstabilität ${sim.resources}/100, Lernfähigkeit ${sim.learning}/100, Restrisiko ${sim.risk}/100.\n\n${state.resources.map((r) => `${r.name}: aktuell ${r.current}/5, Ziel ${r.target}/5, Trend ${r.trend}, Engpass: ${r.bottleneck}, verantwortlich/beobachten: ${r.owner}.`).join("\n")}`],
    ["6. Phasenanalyse", phases.join("\n")],
    ["7. Konflikt- und Koalitionsmuster", [`Mögliche Unterstützungskoalition: ${enabling.map((p) => p.name).join(", ") || "noch unklar"}.`, `Mögliche Prüf- oder Widerstandsachse: ${skeptical.map((p) => p.name).join(", ") || "noch unklar"}.`, `Mögliche Brückenrollen: ${bridges.map((p) => p.name).join(", ") || "gezielt bestimmen"}.`].join("\n")],
    ["8. Kritische Kipppunkte", [`Riskante Annahmen: ${sim.riskyAssumptions.map((a) => a.text).join(" | ") || "keine hochkritisch markiert"}.`, `Ressourcenengpässe: ${sim.deficits.map((r) => `${r.name} (${r.bottleneck})`).join(" | ") || "keine deutlichen Engpässe"}.`, sim.hasPrivacy ? "Datenschutz ist als Stabilisierungspunkt sichtbar." : "Governance-Kipppunkt: fehlende Datenschutzklärung kann Vertrauen und Umsetzung stoppen.", sim.hasParticipation ? "Beteiligung ist als Stabilisierungspunkt sichtbar." : "Beteiligungs-Kipppunkt: fehlende Einwandstruktur kann Scheinkonsens erzeugen."].join("\n")],
    ["9. Interventionsoptionen", state.interventions.map((i) => `${i.name}: Zeitpunkt ${i.timing}; Ziel ${i.target}; Nutzen: ${i.benefit}; Nebenwirkung: ${i.sideEffect}; Aufwand: ${i.effort}.`).join("\n\n")],
    ["10. Entscheidungsmatrix", state.strategies.map((s) => `${s.name}: Entscheidungswert ${strategyScore(s)}.\nGrundidee: ${s.description}\nTempo ${s.speed}/5: ${s.speedText}\nAkzeptanz ${s.acceptance}/5: ${s.acceptanceText}\nKontrolle ${s.control}/5: ${s.controlText}\nInnovation ${s.innovation}/5: ${s.innovationText}\nRisiko ${s.risk}/5: ${s.riskText}\nBedingung: ${s.conditions}\nScheiternsmodus: ${s.failureMode}\nEntscheidungssignal: ${s.decisionSignal}`).join("\n\n")],
    ["11. Maßnahmenplan", ["1. Kritische Annahmen mit realen, anonymisierten Praxispersonen validieren.", "2. Ressourcenengpässe vor dem Workshop aktiv bearbeiten.", "3. Datenschutz-FAQ und klare Nicht-Nutzungsgrenzen bereitstellen.", "4. Pilotgruppe freiwillig starten und nicht als Eliteprojekt überhöhen.", "5. Einwandrunde vor Entscheidung verbindlich einplanen.", "6. Entscheidungsmatrix mit Leitung, Praxis, Governance und Beteiligung prüfen.", "7. Nach Umsetzung Retrospektive durchführen."].join("\n")],
    ["12. Offene Fragen", ["Welche Annahmen sind validiert und welche reine Hypothese?", "Welche Datenarten dürfen in KI-Systeme eingegeben werden?", "Wer entscheidet über Freigabe, Pilotierung und Abbruchkriterien?", "Wie wird verhindert, dass KI als Leistungs- oder Verhaltenskontrolle verstanden wird?", "Welche Ressource ist am knappsten: Zeit, Vertrauen, Aufmerksamkeit oder Klarheit?"].join("\n")],
    ["13. Datenschutz-/Governance-Hinweise", [sim.hasPrivacy ? "Datenschutz und KI-Grenzen sind bereits als Intervention adressiert." : "Datenschutz ist noch nicht ausreichend modelliert.", "Simulationen sollten nur mit Rollen, Archetypen und anonymisierten Szenarien arbeiten.", "Bei Dokument-Upload wären Datenklassifikation, PII-Warnung, Löschlogik und Prompt-Injection-Schutz erforderlich.", "Der OpenAI-Zugriff erfolgt ausschließlich serverseitig, nie über API-Key im Browser."].join("\n")],
    ["14. Grenzen der Simulation", "Diese Simulation ist keine empirische Organisationsdiagnose. Sie erzeugt plausible Hypothesen auf Basis der eingegebenen Informationen. Ergebnisse müssen vor Entscheidungen mit realen Beteiligten validiert werden. Die App darf nicht zur verdeckten Bewertung realer Mitarbeitender genutzt werden."]
  ];
}

function Card({ children, className = "" }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

function TextInput({ label, value, onChange, textarea = false }) {
  const base = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100";
  return <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>{textarea ? <textarea className={`${base} min-h-24`} value={value} onChange={(e) => onChange(e.target.value)} /> : <input className={base} value={value} onChange={(e) => onChange(e.target.value)} />}</label>;
}

function SelectInput({ label, value, onChange, options }) {
  return <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span><select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
}

function Rating({ label, value, onChange }) {
  return <label className="block"><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-700">{label}</span><span className="rounded-full bg-slate-100 px-2 text-xs font-bold">{value}/5</span></div><input className="w-full accent-slate-900" type="range" min="1" max="5" value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}

function Header({ reset }) {
  return (
    <div className="rounded-3xl bg-slate-950 p-8 text-white">
      <div className="mb-3 inline-flex rounded-full border border-white/20 px-3 py-1 text-sm">GPT-gestützte Organisationssimulation</div>
      <h1 className="text-4xl font-bold">KI-Kernel GPT</h1>
      <p className="mt-3 max-w-3xl text-slate-300">Beratungsfähiges Entscheidungs-, Lern- und Simulationssystem für KI-Readiness, Workshops, Beteiligungsprozesse und Veränderungsvorhaben.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={reset} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950">Beispiel neu laden</button>
        <a href="/hilfe.html" target="_blank" rel="noreferrer" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">Hilfe öffnen</a>
      </div>
    </div>
  );
}

function Dashboard({ sim }) {
  const metrics = [["Akzeptanz", sim.acceptance], ["Governance", sim.governance], ["Ressourcen", sim.resources], ["Lernfähigkeit", sim.learning], ["Restrisiko", sim.risk]];
  return <Card><h2 className="mb-4 text-xl font-bold">Dashboard</h2><div className="grid gap-3 md:grid-cols-5">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl border bg-slate-50 p-4"><div className="text-sm font-semibold text-slate-600">{label}</div><div className="mt-2 text-3xl font-bold">{value}</div><div className="mt-3 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-slate-900" style={{ width: `${Math.min(100, value)}%` }} /></div></div>)}</div><div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><b>Kritische Annahmen:</b><br />{sim.riskyAssumptions.map((a) => a.text).join(" | ") || "keine hochkritisch markiert"}</div><div className="rounded-2xl bg-orange-50 p-4 text-sm text-orange-900"><b>Ressourcenengpässe:</b><br />{sim.deficits.map((r) => `${r.name}: ${r.bottleneck}`).join(" | ") || "keine deutlichen Engpässe"}</div></div></Card>;
}

function ContextPanel({ state, setState }) {
  const update = (key, value) => setState((s) => ({ ...s, context: { ...s.context, [key]: value } }));
  return <Card><h2 className="mb-4 text-xl font-bold">Ausgangslage</h2><div className="grid gap-4 md:grid-cols-2"><TextInput label="Titel" value={state.context.title} onChange={(v) => update("title", v)} /><TextInput label="Domäne" value={state.context.domain} onChange={(v) => update("domain", v)} /><div className="md:col-span-2"><TextInput label="Entscheidungsfrage" value={state.context.decisionQuestion} onChange={(v) => update("decisionQuestion", v)} textarea /></div><TextInput label="Ziel" value={state.context.goal} onChange={(v) => update("goal", v)} textarea /><TextInput label="Grenzen / Nicht-Zwecke" value={state.context.boundaries} onChange={(v) => update("boundaries", v)} textarea /></div></Card>;
}

function AssumptionsPanel({ state, setState }) {
  const update = (id, key, value) => setState((s) => ({ ...s, assumptions: s.assumptions.map((a) => a.id === id ? { ...a, [key]: value } : a) }));
  const add = () => setState((s) => ({ ...s, assumptions: [...s.assumptions, { id: newId(), text: "Neue Annahme", source: "manuell", evidence: "niedrig", uncertainty: "mittel", sensitivity: "intern" }] }));
  const remove = (id) => setState((s) => ({ ...s, assumptions: s.assumptions.filter((a) => a.id !== id) }));
  return <Card><div className="mb-4 flex justify-between gap-3"><h2 className="text-xl font-bold">Simulationsannahmen</h2><button onClick={add} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">+ Annahme</button></div><div className="space-y-4">{state.assumptions.map((a) => <div key={a.id} className="rounded-2xl border bg-slate-50 p-4"><TextInput label="Annahme" value={a.text} onChange={(v) => update(a.id, "text", v)} textarea /><div className="mt-3 grid gap-3 md:grid-cols-4"><TextInput label="Quelle" value={a.source} onChange={(v) => update(a.id, "source", v)} /><SelectInput label="Evidenz" value={a.evidence} onChange={(v) => update(a.id, "evidence", v)} options={["niedrig", "mittel", "hoch"]} /><SelectInput label="Unsicherheit" value={a.uncertainty} onChange={(v) => update(a.id, "uncertainty", v)} options={["niedrig", "mittel", "hoch"]} /><SelectInput label="Sensibilität" value={a.sensitivity} onChange={(v) => update(a.id, "sensitivity", v)} options={["unkritisch", "intern", "vertraulich", "personenbezogen vermeiden"]} /></div><button onClick={() => remove(a.id)} className="mt-3 text-sm font-semibold text-rose-700">löschen</button></div>)}</div></Card>;
}

function PersonasPanel({ state, setState }) {
  const [selected, setSelected] = useState(state.personas[0]?.id || "");
  const [template, setTemplate] = useState(0);
  const persona = state.personas.find((p) => p.id === selected) || state.personas[0];
  const update = (id, key, value) => setState((s) => ({ ...s, personas: s.personas.map((p) => p.id === id ? { ...p, [key]: value } : p) }));
  const add = () => { const p = { id: newId(), ...personaTemplates[Number(template)] }; setState((s) => ({ ...s, personas: [...s.personas, p] })); setSelected(p.id); };
  const remove = (id) => setState((s) => ({ ...s, personas: s.personas.filter((p) => p.id !== id) }));
  return <Card><div className="mb-4 flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">Persona- und Stakeholdermodell</h2><div className="flex gap-2"><select className="rounded-xl border px-3 py-2 text-sm" value={template} onChange={(e) => setTemplate(e.target.value)}>{personaTemplates.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}</select><button onClick={add} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">Vorlage hinzufügen</button></div></div>{persona && <div className="grid gap-4 lg:grid-cols-[280px_1fr]"><div className="space-y-2 rounded-2xl border bg-slate-50 p-3">{state.personas.map((p) => <button key={p.id} onClick={() => setSelected(p.id)} className={`w-full rounded-xl border p-3 text-left ${persona.id === p.id ? "bg-white border-slate-900" : "bg-white/70"}`}><b>{p.name}</b><br /><span className="text-xs text-slate-500">{p.role} · Einfluss {p.influence}/5</span></button>)}</div><div className="rounded-2xl border bg-slate-50 p-4"><div className="grid gap-3 md:grid-cols-2"><TextInput label="Name" value={persona.name} onChange={(v) => update(persona.id, "name", v)} /><SelectInput label="Rolle" value={persona.role} onChange={(v) => update(persona.id, "role", v)} options={["Operative Praxis", "Mittlere Führung", "Geschäftsführung", "Verwaltung / Support", "Governance", "Mitarbeitendenvertretung", "QM / Prozesssteuerung", "Stakeholder"]} /><SelectInput label="Haltung" value={persona.stance} onChange={(v) => update(persona.id, "stance", v)} options={["zustimmend", "experimentierfreudig", "offen, aber überlastet", "vorsichtig-kritisch", "schutzorientiert-prüfend", "prüfend und begrenzend", "strukturierend", "unklar"]} /><TextInput label="Informelle Rolle" value={persona.informalRole} onChange={(v) => update(persona.id, "informalRole", v)} /><TextInput label="Konfliktstil" value={persona.conflictStyle} onChange={(v) => update(persona.id, "conflictStyle", v)} /><TextInput label="Trigger" value={persona.trigger} onChange={(v) => update(persona.id, "trigger", v)} /><TextInput label="Lernbedarf" value={persona.learningNeed} onChange={(v) => update(persona.id, "learningNeed", v)} textarea /><TextInput label="Kommunikationsbedarf" value={persona.communicationNeed} onChange={(v) => update(persona.id, "communicationNeed", v)} textarea /></div><div className="mt-4 grid gap-3 md:grid-cols-3"><Rating label="Einfluss" value={persona.influence} onChange={(v) => update(persona.id, "influence", v)} /><Rating label="Betroffenheit" value={persona.affectedness} onChange={(v) => update(persona.id, "affectedness", v)} /><Rating label="Vertrauen" value={persona.trust} onChange={(v) => update(persona.id, "trust", v)} /><Rating label="KI-Kompetenz" value={persona.aiLiteracy} onChange={(v) => update(persona.id, "aiLiteracy", v)} /><Rating label="Risikoempfinden" value={persona.riskSense} onChange={(v) => update(persona.id, "riskSense", v)} /><Rating label="Veränderungsenergie" value={persona.changeEnergy} onChange={(v) => update(persona.id, "changeEnergy", v)} /></div><button onClick={() => remove(persona.id)} className="mt-4 text-sm font-semibold text-rose-700">Persona löschen</button></div></div>}</Card>;
}

function ResourcesPanel({ state, setState }) {
  const [template, setTemplate] = useState(0);
  const update = (id, key, value) => setState((s) => ({ ...s, resources: s.resources.map((r) => r.id === id ? { ...r, [key]: value } : r) }));
  const add = () => setState((s) => ({ ...s, resources: [...s.resources, { id: newId(), ...resourceTemplates[Number(template)] }] }));
  const remove = (id) => setState((s) => ({ ...s, resources: s.resources.filter((r) => r.id !== id) }));
  return <Card><div className="mb-4 flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">Ressourcenmodell</h2><div className="flex gap-2"><select className="rounded-xl border px-3 py-2 text-sm" value={template} onChange={(e) => setTemplate(e.target.value)}>{resourceTemplates.map((r, i) => <option key={r.name} value={i}>{r.name}</option>)}</select><button onClick={add} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">Ressource hinzufügen</button></div></div><div className="grid gap-4 lg:grid-cols-2">{state.resources.map((r) => <div key={r.id} className="rounded-2xl border bg-slate-50 p-4"><div className="grid gap-3 md:grid-cols-2"><TextInput label="Ressource" value={r.name} onChange={(v) => update(r.id, "name", v)} /><SelectInput label="Typ" value={r.type} onChange={(v) => update(r.id, "type", v)} options={["sozial", "kognitiv", "emotional", "operativ", "materiell", "governance", "kommunikativ"]} /><SelectInput label="Logik" value={r.direction} onChange={(v) => update(r.id, "direction", v)} options={["high_good", "low_good"]} /><SelectInput label="Trend" value={r.trend} onChange={(v) => update(r.id, "trend", v)} options={["steigend", "stabil", "fallend", "unklar"]} /><Rating label="Aktuell" value={r.current} onChange={(v) => update(r.id, "current", v)} /><Rating label="Ziel" value={r.target} onChange={(v) => update(r.id, "target", v)} /><TextInput label="Engpass / Kipprisiko" value={r.bottleneck} onChange={(v) => update(r.id, "bottleneck", v)} textarea /><TextInput label="Beobachten / Verantwortlich" value={r.owner} onChange={(v) => update(r.id, "owner", v)} textarea /></div><button onClick={() => remove(r.id)} className="mt-3 text-sm font-semibold text-rose-700">Ressource löschen</button></div>)}</div></Card>;
}

function InterventionsPanel({ state, setState }) {
  const update = (id, key, value) => setState((s) => ({ ...s, interventions: s.interventions.map((i) => i.id === id ? { ...i, [key]: value } : i) }));
  const add = () => setState((s) => ({ ...s, interventions: [...s.interventions, { id: newId(), name: "Neue Intervention", timing: "offen", target: "offen", benefit: "erwarteter Nutzen", sideEffect: "mögliche Nebenwirkung", effort: "mittel" }] }));
  const remove = (id) => setState((s) => ({ ...s, interventions: s.interventions.filter((i) => i.id !== id) }));
  return <Card><div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">Interventionslabor</h2><button onClick={add} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">+ Intervention</button></div><div className="space-y-4">{state.interventions.map((i) => <div key={i.id} className="rounded-2xl border bg-slate-50 p-4"><div className="grid gap-3 md:grid-cols-3"><TextInput label="Name" value={i.name} onChange={(v) => update(i.id, "name", v)} /><TextInput label="Zeitpunkt" value={i.timing} onChange={(v) => update(i.id, "timing", v)} /><SelectInput label="Aufwand" value={i.effort} onChange={(v) => update(i.id, "effort", v)} options={["niedrig", "mittel", "hoch"]} /><TextInput label="Ziel" value={i.target} onChange={(v) => update(i.id, "target", v)} /><TextInput label="Nutzen" value={i.benefit} onChange={(v) => update(i.id, "benefit", v)} textarea /><TextInput label="Nebenwirkung" value={i.sideEffect} onChange={(v) => update(i.id, "sideEffect", v)} textarea /></div><button onClick={() => remove(i.id)} className="mt-3 text-sm font-semibold text-rose-700">Intervention löschen</button></div>)}</div></Card>;
}

function StrategiesPanel({ state, setState }) {
  const update = (id, key, value) => setState((s) => ({ ...s, strategies: s.strategies.map((st) => st.id === id ? { ...st, [key]: value } : st) }));
  return <Card><h2 className="mb-4 text-xl font-bold">Strategievergleich</h2><div className="space-y-4">{state.strategies.map((s) => <div key={s.id} className="rounded-2xl border bg-slate-50 p-4"><TextInput label="Strategie" value={s.name} onChange={(v) => update(s.id, "name", v)} /><div className="mt-3"><TextInput label="Grundidee" value={s.description} onChange={(v) => update(s.id, "description", v)} textarea /></div><div className="mt-4 grid gap-3 lg:grid-cols-5">{[["speed", "Tempo", "speedText"], ["acceptance", "Akzeptanz", "acceptanceText"], ["control", "Kontrolle", "controlText"], ["innovation", "Innovation", "innovationText"], ["risk", "Risiko", "riskText"]].map(([key, label, textKey]) => <div key={key} className="rounded-2xl border bg-white p-3"><Rating label={label} value={s[key]} onChange={(v) => update(s.id, key, v)} /><textarea className="mt-3 min-h-24 w-full rounded-xl border bg-slate-50 p-2 text-xs" value={s[textKey]} onChange={(e) => update(s.id, textKey, e.target.value)} /></div>)}</div><div className="mt-4 grid gap-3 md:grid-cols-3"><TextInput label="Bedingungen" value={s.conditions} onChange={(v) => update(s.id, "conditions", v)} textarea /><TextInput label="Scheiternsmodus" value={s.failureMode} onChange={(v) => update(s.id, "failureMode", v)} textarea /><TextInput label="Entscheidungssignal" value={s.decisionSignal} onChange={(v) => update(s.id, "decisionSignal", v)} textarea /></div></div>)}</div></Card>;
}

function ReportPanel({ state, sim }) {
  const [status, setStatus] = useState("local");
  const [gptReport, setGptReport] = useState(null);
  const report = useMemo(() => buildReport(state, sim, gptReport), [state, sim, gptReport]);
  const callGpt = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }) });
      if (!res.ok) throw new Error(await res.text());
      setGptReport(await res.json());
      setStatus("done");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };
  const copy = () => navigator.clipboard?.writeText(report.map(([t, v]) => `${t}\n${v}`).join("\n\n"));
  return <Card><div className="mb-4 flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Beratungsreport</h2><p className="text-sm text-slate-500">14-teilige Struktur. Lokal heuristisch; optional über serverseitiges GPT-Backend.</p></div><div className="flex gap-2"><button onClick={callGpt} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold">GPT-Backend testen</button><button onClick={copy} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">Report kopieren</button></div></div><div className="mb-4 rounded-2xl bg-slate-50 p-3 text-sm">Status: {status === "local" ? "lokaler Report" : status === "loading" ? "GPT wird aufgerufen" : status === "done" ? "GPT-Report geladen" : "Backend nicht erreichbar oder fehlerhaft"}</div><div className="grid gap-4 lg:grid-cols-2">{report.map(([title, text], i) => <div key={title} className={i === 0 || i === 10 || i === 13 ? "lg:col-span-2" : ""}><div className={`rounded-2xl border p-4 ${i >= 12 ? "bg-amber-50 border-amber-200" : "bg-slate-50"}`}><h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">{title}</h3><p className="whitespace-pre-line text-sm leading-6 text-slate-700">{text}</p></div></div>)}</div></Card>;
}

const tabs = [
  ["dashboard", "Dashboard"],
  ["context", "Ausgangslage"],
  ["assumptions", "Annahmen"],
  ["personas", "Personas"],
  ["resources", "Ressourcen"],
  ["interventions", "Interventionen"],
  ["strategies", "Strategien"],
  ["report", "Report"]
];

export default function App() {
  const [state, setState] = useState(start);
  const [tab, setTab] = useState("dashboard");
  const sim = useMemo(() => compute(state), [state]);
  const panels = {
    dashboard: <Dashboard sim={sim} />,
    context: <ContextPanel state={state} setState={setState} />,
    assumptions: <AssumptionsPanel state={state} setState={setState} />,
    personas: <PersonasPanel state={state} setState={setState} />,
    resources: <ResourcesPanel state={state} setState={setState} />,
    interventions: <InterventionsPanel state={state} setState={setState} />,
    strategies: <StrategiesPanel state={state} setState={setState} />,
    report: <ReportPanel state={state} sim={sim} />
  };
  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8"><div className="mx-auto max-w-7xl space-y-5"><Header reset={() => setState(start)} /><nav className="sticky top-2 z-10 overflow-x-auto rounded-2xl border bg-white/90 p-2 shadow-sm backdrop-blur"><div className="flex min-w-max gap-2">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-3 py-2 text-sm font-bold ${tab === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>)}<a href="/hilfe.html" target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Hilfe</a></div></nav>{panels[tab]}<div className="rounded-2xl border bg-white p-4 text-xs leading-5 text-slate-500">Hinweis: Der OpenAI-Key gehört ausschließlich in die Serverumgebung, z. B. als Coolify Environment Variable. Keine echten personenbezogenen Profile verwenden. <a href="/hilfe.html" target="_blank" rel="noreferrer" className="font-bold text-slate-900 underline">Hilfe öffnen</a></div></div></main>;
}
