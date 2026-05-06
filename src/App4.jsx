import React, { useEffect, useMemo, useState } from "react";

const uid = () => Math.random().toString(36).slice(2, 10);
const STORAGE_KEY = "ki-kernel-scenarios-v3";

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function withIds(s) {
  const x = clone(s);
  x.assumptions = (x.assumptions || []).map(a => ({ id: uid(), ...a }));
  x.personas = (x.personas || []).map(p => ({ id: uid(), ...p }));
  x.resources = (x.resources || []).map(r => ({ id: uid(), ...r }));
  x.interventions = (x.interventions || []).map(i => ({ id: uid(), ...i }));
  x.strategies = (x.strategies || []).map(st => ({ id: uid(), ...st }));
  return x;
}

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

function strategy(name, description, speed, acceptance, control, innovation, risk, conditions, failureMode, decisionSignal) {
  return {
    name, description,
    speed, speedText: criterionText("speed", speed),
    acceptance, acceptanceText: criterionText("acceptance", acceptance),
    control, controlText: criterionText("control", control),
    innovation, innovationText: criterionText("innovation", innovation),
    risk, riskText: criterionText("risk", risk),
    conditions, failureMode, decisionSignal
  };
}

const baseStrategies = [
  strategy("A Governance-first", "Zuerst Regeln, Datenklassen, Rollen, Beteiligung und Freigabewege klären; danach Umsetzung starten.", 2, 3, 5, 3, 2, "Sinnvoll bei hoher Unsicherheit, Schutzbedarf oder rechtlicher Komplexität.", "Scheitert, wenn Governance als Verhinderung und nicht als Ermöglichung erlebt wird.", "Wählen, wenn Vertrauen, Datenschutz oder Beteiligung vor Tempo gehen."),
  strategy("B Pilot-first", "Mit einer freiwilligen Pilotgruppe starten, Erfahrungen sammeln und daraus Standards ableiten.", 4, 4, 3, 5, 3, "Sinnvoll bei ausreichenden Mindestleitplanken und hoher Lernbereitschaft.", "Scheitert, wenn der Pilot als Eliteprojekt oder Schattenfreigabe wahrgenommen wird.", "Wählen, wenn Praxislernen, Akzeptanz und konkrete Beispiele Priorität haben."),
  strategy("C Moderierte Klärung", "Vor einer Entscheidung werden Interessen, Sorgen, Rollen und Grenzen in einem strukturierten Format geklärt.", 3, 4, 4, 3, 2, "Sinnvoll bei Zielkonflikten, Beteiligungsbedarf oder drohendem Scheinkonsens.", "Scheitert, wenn Klärung nicht zu verbindlichen Entscheidungen führt.", "Wählen, wenn der soziale Prozess der Engpass ist.")
];

const standardScenarios = [
  {
    id: "ki-workshop-stille-gruppe",
    label: "Demo · Workshop",
    title: "Stille Gruppe im KI-Workshop",
    desc: "Aus der Workshop-Domäne der ZIP adaptiert: Leitungsgruppe bleibt passiv, weil Unsicherheit, Hierarchie und Beobachtungsmodus zusammenwirken.",
    context: {
      title: "Stille Gruppe im KI-Workshop",
      domain: "Workshop / KI-Literacy / Organisationsentwicklung",
      decisionQuestion: "Wie kann ein KI-Workshop so gestaltet werden, dass stille oder abwartende Teilnehmende sicher in Beteiligung kommen?",
      goal: "Moderationsdesign, Beteiligung und psychologische Sicherheit vor dem Live-Termin prüfen.",
      boundaries: "Keine Bewertung realer Personen. Die Personas sind anonymisierte Rollenmodelle."
    },
    assumptions: [
      { text: "Die Gruppe ist nicht zwingend ablehnend, sondern wartet auf Signale von Leitung und Meinungsführenden.", source: "Vorlage Workshop/Stille Gruppe", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "abgeleitet" },
      { text: "Lange Inputphasen senken Aufmerksamkeit und verstärken passives Verhalten.", source: "Workshop-Regel aus ZIP", evidence: "mittel", uncertainty: "niedrig", sensitivity: "unkritisch", sourceStatus: "abgeleitet" },
      { text: "Skepsis kann produktiv werden, wenn sie früh legitimiert und nicht moralisch abgewertet wird.", source: "Beratungshypothese", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "Hypothese" }
    ],
    personas: [
      { name: "Erfahrene Einrichtungsleitung", role: "Leitung / informelle Meinungsführerin", stance: "vorsichtig-kritisch", influence: 5, affectedness: 4, trust: 3, aiLiteracy: 2, riskSense: 5, changeEnergy: 2, informalRole: "setzt unausgesprochen den Ton", conflictStyle: "abwartend-dominant", trigger: "Mehrarbeit, Datenschutz, Entwertung von Erfahrung", learningNeed: "Praxisnähe und Anerkennung vorhandener Expertise", communicationNeed: "Skepsis ausdrücklich legitimieren" },
      { name: "KI-affine Bereichsleitung", role: "Treiber", stance: "zustimmend", influence: 4, affectedness: 3, trust: 4, aiLiteracy: 4, riskSense: 3, changeEnergy: 5, informalRole: "beschleunigt das Thema", conflictStyle: "lösungsorientiert", trigger: "zu viel Grundsatzdebatte", learningNeed: "konkrete Use Cases", communicationNeed: "nicht als Gegenpol zur Skepsis inszenieren" },
      { name: "Verwaltungsleitung", role: "Compliance / Verfahren", stance: "prüfend", influence: 4, affectedness: 3, trust: 3, aiLiteracy: 3, riskSense: 5, changeEnergy: 3, informalRole: "rechtliches Stoppsignal", conflictStyle: "regelbasiert", trigger: "unklare Upload- und Datenschutzfragen", learningNeed: "Datenklassen, Freigaben, Grenzen", communicationNeed: "früh einbinden" },
      { name: "Pädagogische Leitung", role: "Werte- und Fachlichkeitsperspektive", stance: "schutzorientiert", influence: 4, affectedness: 5, trust: 3, aiLiteracy: 2, riskSense: 5, changeEnergy: 3, informalRole: "ethischer Resonanzraum", conflictStyle: "werteorientiert", trigger: "Menschenwürde, Kontrolle, Fachlichkeitsverlust", learningNeed: "Grenzen von KI in pädagogischer Verantwortung", communicationNeed: "fachliche Autonomie respektieren" }
    ],
    resources: [
      { name: "Aufmerksamkeit", type: "kognitiv", current: 3, target: 4, direction: "high_good", trend: "fallend", bottleneck: "zu lange Inputphasen", owner: "Moderation" },
      { name: "Vertrauen", type: "sozial", current: 3, target: 4, direction: "high_good", trend: "stabil", bottleneck: "unklare Absichten der KI-Einführung", owner: "Leitung" },
      { name: "psychologische Sicherheit", type: "sozial", current: 2, target: 4, direction: "high_good", trend: "fallend", bottleneck: "Angst, sich mit Skepsis zu exponieren", owner: "Moderation" },
      { name: "Zeitdruck", type: "operativ", current: 4, target: 2, direction: "low_good", trend: "steigend", bottleneck: "zu viele Inhalte in kurzer Zeit", owner: "Workshopplanung" }
    ],
    interventions: [
      { name: "Einzelreflexion vor Plenum", timing: "Einstieg", target: "niedrigschwellige Beteiligung", benefit: "reduziert Druck und aktiviert stille Personen", sideEffect: "kostet Zeit", effort: "niedrig" },
      { name: "Skepsis ausdrücklich legitimieren", timing: "Framing", target: "Vertrauen", benefit: "kritische Stimmen werden Ressource", sideEffect: "kann Diskussion verlängern", effort: "niedrig" },
      { name: "KI-Demo mit realistischem Fall", timing: "Mitte", target: "Nutzenkonkretisierung", benefit: "macht Nutzen greifbar", sideEffect: "kann bei zu starkem Wow-Effekt Sorge verstärken", effort: "mittel" }
    ],
    strategies: baseStrategies,
    openQuestions: ["Welche Personen setzen in der Gruppe informell den Ton?", "Welche Datenschutzfrage muss vor dem Workshop beantwortet sein?", "Welche Phase kann gekürzt werden, um Beteiligung zu ermöglichen?"],
    warnings: ["Stille nicht als Zustimmung interpretieren.", "Skepsis nicht psychologisieren oder moralisieren.", "KI-Demo nicht ohne klare Grenze zur Leistungsbewertung durchführen."]
  },
  {
    id: "ki-workshop-polarisierung",
    label: "Demo · Workshop",
    title: "Polarisierte Gruppe bei KI-Einführung",
    desc: "Aus der Polarisierungslogik der ZIP adaptiert: KI-affine und skeptische Lager blockieren sich gegenseitig.",
    context: {
      title: "Polarisierte Gruppe bei KI-Einführung",
      domain: "KI-Einführung / Change / Beteiligung",
      decisionQuestion: "Wie kann ein KI-Einführungsprozess gestaltet werden, wenn sich Treiber- und Schutzlogik gegenseitig blockieren?",
      goal: "Gegenpositionen entpersonalisieren, Zielkonflikte sichtbar machen und eine tragfähige Entscheidungslogik entwickeln.",
      boundaries: "Keine Einstufung realer Mitarbeitender als Bremser oder Treiber. Nur Rollenlogik und Hypothesen."
    },
    assumptions: [
      { text: "Die Polarisierung entsteht weniger aus Technikfragen als aus konkurrierenden Schutz-, Tempo- und Qualitätslogiken.", source: "Vorlage Polarisierung", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "abgeleitet" },
      { text: "Eine schnelle Führungsentscheidung kann Tempo erzeugen, aber Vertrauen kosten.", source: "Beratungshypothese", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "Hypothese" },
      { text: "Eine Governance-first-Strategie stabilisiert Datenschutz, kann aber als Blockade gelesen werden.", source: "Strategievergleich", evidence: "mittel", uncertainty: "niedrig", sensitivity: "unkritisch", sourceStatus: "abgeleitet" }
    ],
    personas: [
      { name: "Digitale Treiberrolle", role: "Innovations-/Fachbereich", stance: "zustimmend", influence: 4, affectedness: 4, trust: 4, aiLiteracy: 5, riskSense: 2, changeEnergy: 5, informalRole: "zieht das Tempo an", conflictStyle: "argumentativ", trigger: "zu viele Verbote", learningNeed: "Governance als Ermöglichung verstehen", communicationNeed: "nicht als naiv markieren" },
      { name: "Schutzorientierte Fachlichkeit", role: "Pädagogik / Soziales", stance: "skeptisch", influence: 4, affectedness: 5, trust: 3, aiLiteracy: 2, riskSense: 5, changeEnergy: 3, informalRole: "bringt legitime Grenzen ein", conflictStyle: "werteorientiert", trigger: "Kontrolle, Entwertung, Datenschutz", learningNeed: "konkrete Grenzen und Nicht-Nutzung", communicationNeed: "als Schutzlogik ernst nehmen" },
      { name: "Datenschutz/Governance", role: "Governance", stance: "prüfend", influence: 5, affectedness: 3, trust: 3, aiLiteracy: 4, riskSense: 5, changeEnergy: 3, informalRole: "Stoppsignal", conflictStyle: "regelbasiert", trigger: "unklare Datenflüsse", learningNeed: "Use Cases früh sehen", communicationNeed: "nicht erst am Ende beteiligen" },
      { name: "Moderierende Leitung", role: "Führung", stance: "vermittelnd", influence: 5, affectedness: 4, trust: 4, aiLiteracy: 3, riskSense: 4, changeEnergy: 4, informalRole: "entscheidet über Rahmen", conflictStyle: "ausgleichend", trigger: "Dauergrundsatzdebatte", learningNeed: "Entscheidungskriterien", communicationNeed: "Zielkonflikte explizit machen" }
    ],
    resources: [
      { name: "Vertrauen", type: "sozial", current: 3, target: 4, direction: "high_good", trend: "fallend", bottleneck: "wechselseitige Unterstellungen", owner: "Moderation" },
      { name: "Klarheit", type: "kognitiv", current: 2, target: 5, direction: "high_good", trend: "stabil", bottleneck: "unklare Entscheidungskriterien", owner: "Leitung" },
      { name: "Konfliktspannung", type: "sozial", current: 4, target: 2, direction: "low_good", trend: "steigend", bottleneck: "Lagerbildung", owner: "Moderation" },
      { name: "Innovationsenergie", type: "emotional", current: 4, target: 4, direction: "high_good", trend: "fallend", bottleneck: "Frustration durch Grundsatzstreit", owner: "Projektleitung" }
    ],
    interventions: [
      { name: "Steelman-Runde", timing: "früh", target: "Entpersonalisierung", benefit: "jede Seite formuliert die stärkste faire Version der Gegenposition", sideEffect: "braucht reife Moderation", effort: "mittel" },
      { name: "Entscheidungskriterien sichtbar machen", timing: "vor Strategieentscheidung", target: "Klarheit", benefit: "Tempo, Schutz, Qualität und Beteiligung werden abwägbar", sideEffect: "kann Zielkonflikte verschärfen", effort: "mittel" },
      { name: "Minimal-Governance für Piloten", timing: "vor Pilot", target: "Handlungsfähigkeit", benefit: "ermöglicht Lernen ohne Kontrollverlust", sideEffect: "kann als zu eng oder zu locker kritisiert werden", effort: "mittel" }
    ],
    strategies: baseStrategies,
    openQuestions: ["Welche Positionen sind legitime Schutzlogiken und keine Blockaden?", "Welche Use Cases dürfen ohne weitere Freigabe pilotiert werden?", "Welche Entscheidungskriterien sind nicht verhandelbar?"],
    warnings: ["Treiber nicht als naiv, Skeptiker nicht als innovationsfeindlich rahmen.", "Nicht zu früh auf Konsens drängen.", "Ohne Governance-Mindestlinie droht Schatten-KI."]
  },
  {
    id: "paedagogik-heterogene-lerngruppe",
    label: "Demo · Pädagogik",
    title: "Heterogene Lerngruppe in digitaler Unterrichtssequenz",
    desc: "Aus der Pädagogik-Domäne adaptiert: Unterrichtsplanung wird als Szenario aus Lernmotivation, Verstandenheit und Differenzierung modelliert.",
    context: {
      title: "Heterogene Lerngruppe in digitaler Unterrichtssequenz",
      domain: "Pädagogik / Unterrichtsentwicklung / digitale Kompetenzen",
      decisionQuestion: "Wie muss eine digitale Unterrichtssequenz gestaltet werden, damit leistungsstarke, stille, demotivierte und förderbedürftige Lernende anschlussfähig bleiben?",
      goal: "Differenzierung, Beteiligung und Transferfähigkeit vor der Durchführung prüfen.",
      boundaries: "Keine realen Schülerprofile; nur anonymisierte Lernenden-Archetypen."
    },
    assumptions: [
      { text: "Die Lerngruppe ist nicht homogen; dieselbe Methode wirkt je nach Vorwissen und Sicherheit unterschiedlich.", source: "Vorlage Pädagogik", evidence: "hoch", uncertainty: "niedrig", sensitivity: "intern", sourceStatus: "abgeleitet" },
      { text: "Stille Lernende brauchen sichere Zwischenschritte, bevor sie im Plenum sichtbar werden.", source: "pädagogische Hypothese", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "Hypothese" },
      { text: "Leistungsstarke Lernende können bei zu viel Wiederholung aussteigen.", source: "Vorlage Pädagogik", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "abgeleitet" }
    ],
    personas: [
      { name: "Leistungsstarker Lernender", role: "Lerngruppe", stance: "fordernd", influence: 3, affectedness: 3, trust: 4, aiLiteracy: 4, riskSense: 2, changeEnergy: 4, informalRole: "zieht Tempo an", conflictStyle: "ungeduldig", trigger: "Langeweile durch Wiederholung", learningNeed: "Herausforderung und Transfer", communicationNeed: "Erweiterungsaufgaben anbieten" },
      { name: "Stille Lernende", role: "Lerngruppe", stance: "zurückhaltend", influence: 2, affectedness: 4, trust: 3, aiLiteracy: 3, riskSense: 4, changeEnergy: 2, informalRole: "zeigt Überforderung spät", conflictStyle: "vermeidend", trigger: "Bloßstellung und Fehlerangst", learningNeed: "sichere Übungsräume", communicationNeed: "erst schriftlich/zu zweit aktivieren" },
      { name: "Demotivierter Lernender", role: "Lerngruppe", stance: "distanziert", influence: 3, affectedness: 4, trust: 2, aiLiteracy: 2, riskSense: 3, changeEnergy: 2, informalRole: "kann Ablenkung verstärken", conflictStyle: "ausweichend", trigger: "Sinnlosigkeit", learningNeed: "Praxisnutzen", communicationNeed: "kurze Erfolgserlebnisse" },
      { name: "Förderbedürftiger Lernender", role: "Lerngruppe", stance: "unsicher", influence: 2, affectedness: 5, trust: 3, aiLiteracy: 2, riskSense: 4, changeEnergy: 2, informalRole: "Indikator für Überforderung", conflictStyle: "passiver Rückzug", trigger: "fehlende Vorkenntnisse", learningNeed: "Basisaufgaben und klare Sprache", communicationNeed: "kleinschrittige Anleitung" }
    ],
    resources: [
      { name: "Lernmotivation", type: "emotional", current: 3, target: 4, direction: "high_good", trend: "stabil", bottleneck: "Sinnfrage und Überforderung", owner: "Lehrkraft" },
      { name: "Verstandenheit", type: "kognitiv", current: 3, target: 5, direction: "high_good", trend: "unklar", bottleneck: "unterschiedliche Vorkenntnisse", owner: "Lehrkraft" },
      { name: "Klassenklima", type: "sozial", current: 4, target: 4, direction: "high_good", trend: "stabil", bottleneck: "Bloßstellung im Plenum", owner: "Lehrkraft" },
      { name: "Unterrichtszeit", type: "operativ", current: 4, target: 2, direction: "low_good", trend: "steigend", bottleneck: "zu viele Ziele in einer Sequenz", owner: "Planung" }
    ],
    interventions: [
      { name: "Differenzierte Aufgabenstufen", timing: "Erarbeitung", target: "Verstandenheit", benefit: "starke und schwächere Lernende bleiben anschlussfähig", sideEffect: "höherer Vorbereitungsaufwand", effort: "hoch" },
      { name: "Murmelphase vor Plenum", timing: "Austausch", target: "psychologische Sicherheit", benefit: "stille Lernende können Gedanken vorformulieren", sideEffect: "verlangsamt Plenum", effort: "niedrig" },
      { name: "Praxisnaher Transferfall", timing: "Sicherung", target: "Sinn und Motivation", benefit: "demotivierte Lernende sehen Nutzen", sideEffect: "kann fachliche Breite reduzieren", effort: "mittel" }
    ],
    strategies: [
      strategy("A Sicherheit-first", "Zuerst Basisverständnis, Sprachklarheit und sichere Beteiligung herstellen.", 2, 4, 4, 3, 2, "Sinnvoll bei hoher Heterogenität und Fehlerangst.", "Scheitert, wenn leistungsstarke Lernende nicht gefordert werden.", "Wählen, wenn Überforderung das Hauptrisiko ist."),
      strategy("B Challenge-first", "Mit anspruchsvollem Problem starten und differenziert unterstützen.", 4, 3, 3, 5, 4, "Sinnvoll bei hoher Aktivierungsnotwendigkeit.", "Scheitert, wenn stille oder förderbedürftige Lernende früh aussteigen.", "Wählen, wenn Motivation durch Herausforderung entsteht."),
      strategy("C Differenzierung-first", "Sequenz konsequent in Basis, Erweiterung und Transfer aufteilen.", 3, 4, 4, 4, 2, "Sinnvoll bei breitem Leistungsgefälle.", "Scheitert, wenn die Struktur zu komplex wird.", "Wählen, wenn Anschlussfähigkeit für alle zentral ist.")
    ],
    openQuestions: ["Welche Mindestkompetenz sollen alle am Ende sicher können?", "Welche Erweiterungsaufgabe fordert leistungsstarke Lernende?", "Wo kann Fehlerangst reduziert werden?"],
    warnings: ["Nicht aus Einzelverhalten auf Persönlichkeit schließen.", "Überforderung kann als Demotivation erscheinen.", "Digitale Methode darf das Lernziel nicht überdecken."]
  },
  {
    id: "angebotsentwicklung-bvb-digitalisierung",
    label: "Demo · Angebotsentwicklung",
    title: "BvB-Digitalisierung als neues Angebot",
    desc: "Aus der Angebotsentwicklungs-Domäne adaptiert: Budget, Zielgruppenbezug und Stakeholder-Vertrauen werden zu kritischen Ressourcen.",
    context: {
      title: "BvB-Digitalisierung als neues Angebot",
      domain: "Angebotsentwicklung / Bildung / Sozialwirtschaft",
      decisionQuestion: "Wie kann ein digitales Angebot für die Berufsvorbereitung so entwickelt werden, dass Zielgruppenbedarf, Finanzierung und interne Umsetzbarkeit zusammenpassen?",
      goal: "Bedarfsannahmen, Stakeholder-Koalitionen, Pilotfähigkeit und Skalierungsrisiken prüfen.",
      boundaries: "Keine realen Teilnehmendenprofile; Zielgruppe nur anonymisiert betrachten."
    },
    assumptions: [
      { text: "Das Angebot ist nur tragfähig, wenn der Zielgruppenbedarf nicht aus Organisationssicht, sondern aus Teilnehmendenperspektive belegt wird.", source: "Vorlage Angebotsentwicklung", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "abgeleitet" },
      { text: "Budgetdruck kann fachliche Qualität und Beteiligung verkürzen.", source: "Budget-Krisenlogik", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "Hypothese" },
      { text: "Ein interner Verwaltungseinwand kann das Projekt blockieren, wenn Compliance und Ressourcen nicht früh geklärt sind.", source: "Vorlage Veto-Reflex", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "abgeleitet" }
    ],
    personas: [
      { name: "Programmleitung / Treiberin", role: "Projektleitung", stance: "zustimmend", influence: 5, affectedness: 4, trust: 4, aiLiteracy: 4, riskSense: 3, changeEnergy: 5, informalRole: "hält Vision zusammen", conflictStyle: "durchsetzungsstark", trigger: "langsame Abstimmung", learningNeed: "realistische Skalierung", communicationNeed: "Wirkung und Grenzen balancieren" },
      { name: "Geldgeberrolle", role: "Finanzierung", stance: "prüfend", influence: 5, affectedness: 3, trust: 3, aiLiteracy: 2, riskSense: 4, changeEnergy: 3, informalRole: "setzt harte Bedingungen", conflictStyle: "ergebnisorientiert", trigger: "unklare Wirkung", learningNeed: "Bedarfsnachweis und Evaluation", communicationNeed: "Wirkungslogik und Kennzahlen" },
      { name: "Zielgruppenvertretung", role: "Teilnehmendenperspektive", stance: "pragmatisch", influence: 3, affectedness: 5, trust: 3, aiLiteracy: 3, riskSense: 3, changeEnergy: 3, informalRole: "Realitätscheck", conflictStyle: "direkt", trigger: "Angebot passt nicht zum Alltag", learningNeed: "konkreter persönlicher Nutzen", communicationNeed: "einfache Sprache und Mitsprache" },
      { name: "Interner Verwaltungskritiker", role: "Verwaltung / Compliance", stance: "skeptisch", influence: 4, affectedness: 3, trust: 3, aiLiteracy: 2, riskSense: 5, changeEnergy: 2, informalRole: "Veto-Risiko", conflictStyle: "formal", trigger: "Mehraufwand und unklare Zuständigkeit", learningNeed: "Ressourcen- und Prozessklärung", communicationNeed: "frühzeitig einbinden" }
    ],
    resources: [
      { name: "Stakeholder-Vertrauen", type: "sozial", current: 3, target: 4, direction: "high_good", trend: "unklar", bottleneck: "unklare Wirkung und Zuständigkeit", owner: "Projektleitung" },
      { name: "Engagement", type: "emotional", current: 4, target: 4, direction: "high_good", trend: "stabil", bottleneck: "zu wenig Zielgruppenbezug", owner: "Fachbereich" },
      { name: "Budgetdruck", type: "materiell", current: 4, target: 2, direction: "low_good", trend: "steigend", bottleneck: "Finanzierungsunsicherheit", owner: "Programmleitung" },
      { name: "Projektzeitraum", type: "operativ", current: 3, target: 3, direction: "low_good", trend: "stabil", bottleneck: "Pilot und Evaluation konkurrieren", owner: "Projektsteuerung" }
    ],
    interventions: [
      { name: "Zielgruppeninterviews vor Konzeptfinalisierung", timing: "Bedarfsanalyse", target: "Bedarfsnachweis", benefit: "verhindert Zielgruppen-Drift", sideEffect: "verzögert Konzeptphase", effort: "mittel" },
      { name: "Minimal-Pilot mit Evaluationsraster", timing: "Pilotplanung", target: "Pilotreife", benefit: "macht Wirkung prüfbar", sideEffect: "begrenzte Aussagekraft", effort: "mittel" },
      { name: "Compliance-Check vor Förderantrag", timing: "vor Finanzierung", target: "Veto-Risiko senken", benefit: "klärt Zuständigkeiten und Ressourcen", sideEffect: "kann Anforderungen erhöhen", effort: "mittel" }
    ],
    strategies: [
      strategy("A Bedarfsanalyse-first", "Zuerst Zielgruppe, Bedarf und Alltagspassung prüfen.", 2, 4, 4, 3, 2, "Sinnvoll bei unklarem Bedarf.", "Scheitert, wenn Analysephase zu lang wird.", "Wählen, wenn Zielgruppenpassung kritisch ist."),
      strategy("B Pilot-first", "Kleinen Pilot starten und Wirkung praktisch prüfen.", 4, 4, 3, 5, 3, "Sinnvoll bei hinreichender Mindestklarheit.", "Scheitert ohne Evaluationsdesign.", "Wählen, wenn Lernen wichtiger ist als Vollständigkeit."),
      strategy("C Funding-first", "Finanzierung sichern und danach Konzept operationalisieren.", 3, 3, 4, 3, 4, "Sinnvoll bei harter Ressourcenknappheit.", "Scheitert, wenn Finanzierungslogik fachliche Passung verdrängt.", "Wählen, wenn Budget der zentrale Engpass ist.")
    ],
    openQuestions: ["Wie wird Zielgruppenbedarf belegt?", "Welche Mindestwirkung muss der Pilot zeigen?", "Welche internen Prozesse werden zusätzlich belastet?"],
    warnings: ["Wirkungsversprechen nicht vor Bedarfsnachweis überziehen.", "Budget darf Zielgruppenpassung nicht ersetzen.", "Interne Verwaltung nicht erst als Bremse wahrnehmen, sondern als Prüfrolle einbauen."]
  },
  {
    id: "team-stormingphase",
    label: "Demo · Teamentwicklung",
    title: "Team in der Stormingphase",
    desc: "Aus der Teamentwicklungs-Domäne adaptiert: Rollenunklarheit, informelle Macht und psychologische Sicherheit werden simuliert.",
    context: {
      title: "Team in der Stormingphase",
      domain: "Teamentwicklung / Führung / Konfliktklärung",
      decisionQuestion: "Welche Führungs- und Moderationsinterventionen helfen einem Team in der Stormingphase, ohne Konflikte zu verdecken?",
      goal: "Rollenklärung, psychologische Sicherheit und konstruktive Konfliktbearbeitung vorbereiten.",
      boundaries: "Keine verdeckte Analyse realer Mitarbeitender; nur anonymisierte Teamrollen."
    },
    assumptions: [
      { text: "Der sichtbare Sachkonflikt verdeckt teilweise einen Rollen- und Anerkennungskonflikt.", source: "Vorlage Teamentwicklung/Storming", evidence: "mittel", uncertainty: "mittel", sensitivity: "vertraulich", sourceStatus: "Hypothese" },
      { text: "Psychologische Sicherheit steigt nur, wenn Leitung eigene Unsicherheiten und Fehleranteile sichtbar macht.", source: "Teamregel aus ZIP adaptiert", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "abgeleitet" },
      { text: "Informelle Führung kann formale Rollenklärung stabilisieren oder blockieren.", source: "Beratungshypothese", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "Hypothese" }
    ],
    personas: [
      { name: "Teamleitung", role: "Führung", stance: "ergebnisorientiert", influence: 5, affectedness: 5, trust: 3, aiLiteracy: 3, riskSense: 4, changeEnergy: 4, informalRole: "formale Entscheidung", conflictStyle: "steuernd", trigger: "ineffiziente Diskussionen", learningNeed: "Fehleranteile benennen und Rahmen halten", communicationNeed: "nicht zu früh harmonisieren" },
      { name: "Leistungsträger", role: "Fachkraft", stance: "aktiv", influence: 4, affectedness: 4, trust: 3, aiLiteracy: 4, riskSense: 3, changeEnergy: 4, informalRole: "fachlicher Standard", conflictStyle: "direkt", trigger: "fehlende Fairness", learningNeed: "Anerkennung und klare Prioritäten", communicationNeed: "nicht instrumentalisieren" },
      { name: "Informelle Veteranin", role: "Erfahrene Fachkraft", stance: "skeptisch", influence: 5, affectedness: 4, trust: 2, aiLiteracy: 2, riskSense: 5, changeEnergy: 2, informalRole: "informelle Macht", conflictStyle: "kritisch", trigger: "Respektverlust und neue Regeln", learningNeed: "Einfluss konstruktiv nutzen", communicationNeed: "Widerstand als Erfahrungssignal lesen" },
      { name: "Neues Teammitglied", role: "Neuling", stance: "unsicher", influence: 2, affectedness: 5, trust: 3, aiLiteracy: 3, riskSense: 4, changeEnergy: 3, informalRole: "Seismograf für Klima", conflictStyle: "vermeidend", trigger: "Loyalitätskonflikte", learningNeed: "Orientierung und Zugehörigkeit", communicationNeed: "geschützte Beteiligung" }
    ],
    resources: [
      { name: "psychologische Sicherheit", type: "sozial", current: 2, target: 4, direction: "high_good", trend: "fallend", bottleneck: "Angst vor Gesichtsverlust", owner: "Teamleitung / Moderation" },
      { name: "Teamenergie", type: "emotional", current: 3, target: 4, direction: "high_good", trend: "fallend", bottleneck: "Konfliktermüdung", owner: "Teamleitung" },
      { name: "Kohäsion", type: "sozial", current: 2, target: 4, direction: "high_good", trend: "unklar", bottleneck: "Lagerbildung", owner: "Team" },
      { name: "Konfliktspannung", type: "sozial", current: 5, target: 2, direction: "low_good", trend: "steigend", bottleneck: "ungeklärte Rollen", owner: "Moderation" }
    ],
    interventions: [
      { name: "Rollenklärung mit Erwartungsabgleich", timing: "früh", target: "Klarheit", benefit: "reduziert verdeckte Zuständigkeitskonflikte", sideEffect: "kann Machtfragen sichtbar verschärfen", effort: "mittel" },
      { name: "Retrospektive ohne Schuldzuweisung", timing: "vor Vereinbarungen", target: "psychologische Sicherheit", benefit: "macht Muster besprechbar", sideEffect: "braucht gutes Framing", effort: "mittel" },
      { name: "Leitung benennt eigenen Beitrag", timing: "Einstieg", target: "Vertrauen", benefit: "senkt Verteidigung", sideEffect: "kann bei unsicherer Leitung schwach wirken", effort: "niedrig" }
    ],
    strategies: [
      strategy("A Rollenklärung-first", "Zuerst Erwartungen, Verantwortlichkeiten und Schnittstellen klären.", 3, 4, 4, 3, 2, "Sinnvoll bei unklaren Zuständigkeiten.", "Scheitert, wenn Machtfragen ausgeblendet werden.", "Wählen, wenn Unklarheit der Haupttreiber ist."),
      strategy("B Konfliktbearbeitung-first", "Konflikte explizit bearbeiten, bevor neue Regeln gesetzt werden.", 2, 3, 3, 3, 4, "Sinnvoll bei hoher Spannung.", "Scheitert, wenn Sicherheit fehlt.", "Wählen, wenn verdeckte Konflikte jede Maßnahme blockieren."),
      strategy("C Vereinbarungen-first", "Schnell gemeinsame Arbeitsregeln definieren.", 4, 3, 4, 2, 3, "Sinnvoll bei akutem Handlungsdruck.", "Scheitert, wenn Regeln nur Oberfläche stabilisieren.", "Wählen, wenn das Team sofort arbeitsfähig werden muss." )
    ],
    openQuestions: ["Welche Rollenunklarheit erzeugt die meisten Reibungen?", "Wer kann als Brückenrolle wirken?", "Welche Konflikte müssen vor Regeln sichtbar werden?"],
    warnings: ["Harmonie nicht mit psychologischer Sicherheit verwechseln.", "Informelle Macht nicht ignorieren.", "Nicht über reale Mitarbeitende diagnostizieren."]
  },
  {
    id: "mav-personalfuehrung",
    label: "Demo · Governance",
    title: "MAV-Beteiligung bei Personalführung rechtssicher gestalten",
    desc: "Aus deinem Importfall verallgemeinert: arbeitsrechtliche Kompetenz, MAV-Rolle, Dokumentation und Führungshandeln werden als Szenario modelliert.",
    context: {
      title: "MAV-Beteiligung bei Personalführung rechtssicher gestalten",
      domain: "Führung / Arbeitsrecht / MAV / Governance",
      decisionQuestion: "Wie können Führungskräfte rechtliche Vorgaben, MAV-Beteiligung und vertrauensvolle Personalführung zusammenbringen?",
      goal: "Handlungssicherheit erhöhen, Eskalationsrisiken senken und Rollen zwischen Dienststellenleitung, Führung und MAV klären.",
      boundaries: "Kein Ersatz für Rechtsberatung. Keine Bewertung konkreter Personen oder laufender Einzelfälle."
    },
    assumptions: [
      { text: "Führungskräfte benötigen nicht Volljuristenwissen, sondern sichere Orientierung zu Schwellen, Rollen und Eskalationspunkten.", source: "Importfall abstrahiert", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "abgeleitet" },
      { text: "Unklare Rollen zwischen Dienststellenleitung und MAV erhöhen Konflikt- und Fristrisiken.", source: "Governance-Hypothese", evidence: "mittel", uncertainty: "mittel", sensitivity: "intern", sourceStatus: "Hypothese" },
      { text: "Schattenakten oder informelle Dokumentation erzeugen erhebliche rechtliche und vertrauensbezogene Risiken.", source: "Warnlogik Importfall", evidence: "hoch", uncertainty: "niedrig", sensitivity: "vertraulich", sourceStatus: "abgeleitet" }
    ],
    personas: [
      { name: "Strategische Führungskraft", role: "Führung", stance: "lernbereit", influence: 5, affectedness: 5, trust: 3, aiLiteracy: 3, riskSense: 4, changeEnergy: 4, informalRole: "setzt Führungsstandard", conflictStyle: "pragmatisch", trigger: "unklare Rechtslage", learningNeed: "Schwellen, Fristen, Gesprächslogik", communicationNeed: "konkrete Entscheidungshilfen" },
      { name: "MAV-Rolle", role: "Mitarbeitendenvertretung", stance: "schutzorientiert-prüfend", influence: 5, affectedness: 4, trust: 3, aiLiteracy: 2, riskSense: 5, changeEnergy: 3, informalRole: "Legitimation und Frühwarnung", conflictStyle: "interessenklärend", trigger: "späte Beteiligung", learningNeed: "Rollenklärung und transparente Kommunikation", communicationNeed: "früh und nicht nur formal einbinden" },
      { name: "Personalverantwortliche Stelle", role: "HR / Personal", stance: "strukturierend", influence: 4, affectedness: 4, trust: 4, aiLiteracy: 3, riskSense: 5, changeEnergy: 3, informalRole: "Prozessanker", conflictStyle: "formal klärend", trigger: "Fristversäumnisse", learningNeed: "Prozesssicherheit und Dokumentation", communicationNeed: "klare Standards" },
      { name: "Juristische Prüfperspektive", role: "Rechts-/Governanceberatung", stance: "prüfend", influence: 4, affectedness: 3, trust: 4, aiLiteracy: 3, riskSense: 5, changeEnergy: 2, informalRole: "Eskalationssicherung", conflictStyle: "präzise begrenzend", trigger: "riskante Einzelfallinterpretation", learningNeed: "saubere Sachverhaltsklärung", communicationNeed: "früh bei roten Linien einbinden" }
    ],
    resources: [
      { name: "Rechtssicherheit", type: "governance", current: 3, target: 5, direction: "high_good", trend: "unklar", bottleneck: "uneinheitliche Anwendung", owner: "HR / Rechtsberatung" },
      { name: "Vertrauen zwischen Leitung und MAV", type: "sozial", current: 3, target: 4, direction: "high_good", trend: "stabil", bottleneck: "späte oder rein formale Beteiligung", owner: "Dienststellenleitung" },
      { name: "Dokumentationsqualität", type: "governance", current: 3, target: 5, direction: "high_good", trend: "unklar", bottleneck: "informelle Nebenakten", owner: "Personal / Führung" },
      { name: "Fristendruck", type: "operativ", current: 4, target: 2, direction: "low_good", trend: "steigend", bottleneck: "unklare Prozessschritte", owner: "Prozessverantwortliche" }
    ],
    interventions: [
      { name: "Jour fixe Dienststellenleitung–MAV", timing: "regelmäßig", target: "Vertrauen und Rollenklärung", benefit: "reduziert Überraschungen und Eskalationen", sideEffect: "braucht verbindliche Agenda", effort: "mittel" },
      { name: "Führungskräfte-Webinar mit Fallarbeit", timing: "vor kritischen Personalprozessen", target: "Handlungssicherheit", benefit: "macht Schwellen und Grenzen greifbar", sideEffect: "kann Rechtsberatungserwartung erzeugen", effort: "mittel" },
      { name: "Checkliste Personalgespräch und Dokumentation", timing: "vor Gespräch", target: "Prozesssicherheit", benefit: "senkt Schattenakten- und Fristrisiko", sideEffect: "kann formalistisch wirken", effort: "mittel" }
    ],
    strategies: [
      strategy("A Schulung-first", "Führungskräfte werden durch Webinar, Fallarbeit und Checklisten handlungssicher gemacht.", 3, 4, 4, 3, 2, "Sinnvoll bei Kompetenzlücken.", "Scheitert, wenn Schulung nicht in Prozesse übersetzt wird.", "Wählen, wenn Wissen und Anwendung der Engpass sind."),
      strategy("B Prozess-first", "Erst Prozess, Zuständigkeiten, Fristen und Dokumentationsstandards verbindlich klären.", 2, 3, 5, 2, 2, "Sinnvoll bei uneinheitlicher Praxis.", "Scheitert, wenn Führungskräfte die Logik nicht verstehen.", "Wählen, wenn Rechts- und Dokumentationssicherheit Priorität hat."),
      strategy("C Vertrauens-first", "Regelmäßige Klärungsformate mit MAV etablieren, bevor Einzelfälle eskalieren.", 3, 4, 4, 3, 2, "Sinnvoll bei belasteter Zusammenarbeit.", "Scheitert, wenn es keine verbindliche Entscheidungslogik gibt.", "Wählen, wenn Beziehung und Rollenverständnis der Engpass sind." )
    ],
    openQuestions: ["Welche Personalprozesse erzeugen die meisten Unsicherheiten?", "Wo beginnt Beteiligung früh genug?", "Wie werden Schattenakten organisatorisch verhindert?", "Welche Fragen müssen an Rechtsberatung eskaliert werden?"],
    warnings: ["Nicht als Rechtsberatungstool missverstehen.", "MAV nicht erst bei fertiger Entscheidung informieren.", "Dokumentationspraxis ist Vertrauens- und Rechtsrisiko zugleich."]
  }
];

const initialScenario = withIds(standardScenarios[0]);

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
  const hasParticipation = interventions.some(i => /einwand|beteilig|freiwillig|workshop|jour fixe|rollenklärung/i.test(`${i.name} ${i.target}`));
  const acceptance = Math.round(Math.min(100, 20 + avg(personas, "trust") * 8 + avg(personas, "aiLiteracy") * 3 + avg(personas, "changeEnergy") * 4 + (hasParticipation ? 16 : 0) + res * .15 - risky.length * 4));
  const governance = Math.round(Math.min(100, 30 + avg(personas, "riskSense") * 5 + (hasPrivacy ? 22 : 0) + res * .18));
  const learning = Math.round(Math.min(100, 25 + avg(personas, "aiLiteracy") * 7 + avg(personas, "changeEnergy") * 5 + interventions.length * 5));
  const risk = Math.round(Math.max(0, 100 - (acceptance * .35 + governance * .4 + learning * .15 + res * .1)));
  const bestStrategy = [...strategies].sort((a,b)=>strategyScore(b)-strategyScore(a))[0];
  return { acceptance, governance, learning, resources: Math.round(res), risk, risky, deficits: resources.filter(r=>resourceGap(r)>0), bestStrategy };
}
function loadSaved() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function persistSaved(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

function reportTitle(key) {
  const labels = {
    executiveSummary: "Executive Summary",
    ausgangslage: "Ausgangslage",
    simulationsannahmen: "Simulationsannahmen",
    stakeholderanalyse: "Persona- und Stakeholderanalyse",
    ressourcenRisikolage: "Ressourcen- und Risikolage",
    phasenanalyse: "Phasenanalyse",
    konfliktKoalitionsmuster: "Konflikt- und Koalitionsmuster",
    kritischeKipppunkte: "Kritische Kipppunkte",
    interventionsoptionen: "Interventionsoptionen",
    entscheidungsmatrix: "Entscheidungsmatrix",
    massnahmenplan: "Maßnahmenplan",
    offeneFragen: "Offene Fragen",
    governanceHinweise: "Datenschutz-/Governance-Hinweise",
    grenzenDerSimulation: "Grenzen der Simulation"
  };
  return labels[key] || key;
}

function Card({ children, className = "" }) { return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>; }
function Button({ children, onClick, dark=false, disabled=false }) { return <button disabled={disabled} onClick={onClick} className={`${dark ? "bg-slate-900 text-white" : "bg-white text-slate-800 border border-slate-200"} rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50`}>{children}</button>; }
function Field({ label, value, onChange, area=false }) { const c="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-100"; return <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>{area?<textarea className={`${c} min-h-24`} value={value||""} onChange={e=>onChange(e.target.value)}/>:<input className={c} value={value||""} onChange={e=>onChange(e.target.value)}/>}</label>; }
function Range({ label, value, onChange }) { return <label><div className="mb-1 flex justify-between text-sm"><b>{label}</b><span>{value||3}/5</span></div><input type="range" min="1" max="5" value={value||3} onChange={e=>onChange(Number(e.target.value))} className="w-full accent-slate-900"/></label>; }
function Mini({title,text}){return <div className="rounded-xl bg-white p-3"><b>{title}</b><p className="mt-2 whitespace-pre-line text-sm text-slate-600">{text || "—"}</p></div>}

function TemplatesPanel({ setState, setTab }) {
  function loadTemplate(template) {
    setState(withIds(template));
    setTab("Ausgangslage");
  }
  return <Card>
    <h2 className="text-xl font-bold">Standardszenarien</h2>
    <p className="mt-1 text-sm text-slate-600">Diese Vorlagen sind aus den Beispielen der ZIP-Datei in die Logik der GPT-App übersetzt. Sie dienen als Demo und als Arbeitsgrundlage.</p>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {standardScenarios.map(t => <div key={t.id} className="rounded-2xl border bg-slate-50 p-4">
        <div className="mb-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{t.label}</div>
        <h3 className="text-lg font-bold">{t.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{t.desc}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white px-2 py-1">Annahmen {t.assumptions.length}</span>
          <span className="rounded-full bg-white px-2 py-1">Personas {t.personas.length}</span>
          <span className="rounded-full bg-white px-2 py-1">Ressourcen {t.resources.length}</span>
          <span className="rounded-full bg-white px-2 py-1">Interventionen {t.interventions.length}</span>
          <span className="rounded-full bg-white px-2 py-1">Strategien {t.strategies.length}</span>
        </div>
        <div className="mt-4"><Button dark onClick={() => loadTemplate(t)}>Vorlage laden und bearbeiten</Button></div>
      </div>)}
    </div>
  </Card>;
}

function ImportPanel({ setState, setTab }) {
  const [text,setText]=useState(""); const [draft,setDraft]=useState(null); const [documentType,setDocumentType]=useState("Konzept"); const [analysisMode,setAnalysisMode]=useState("beratend"); const [status,setStatus]=useState("idle"); const [err,setErr]=useState(""); const [fileInfo,setFileInfo]=useState("");
  async function handleFile(e) { const file = e.target.files?.[0]; if (!file) return; setErr(""); setFileInfo(`${file.name} (${Math.round(file.size/1024)} KB)`); const name = file.name.toLowerCase(); if (!(name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".json") || file.type.startsWith("text/"))) { setErr("Dieser Upload Light liest aktuell nur TXT, MD, JSON oder reine Textdateien. DOCX/PDF folgen später serverseitig."); return; } if (file.size > 1024 * 1024) { setErr("Datei ist größer als 1 MB. Bitte kürzen."); return; } const content = await file.text(); setText(content); }
  async function runImport(){ setStatus("loading"); setErr(""); try{ const res=await fetch("/api/import-scenario",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,documentType,analysisMode})}); if(!res.ok) throw new Error(await res.text()); const raw = await res.json(); setDraft(normalizeDraft(raw)); setStatus("done"); }catch(e){ setErr(String(e.message||e)); setStatus("error"); } }
  function acceptDraft() { if (!draft) return; setState(draft); setDraft(null); setTab("Ausgangslage"); }
  return <Card><h2 className="text-xl font-bold">Import Light: Szenario aus Konzept erstellen</h2><p className="mt-1 text-sm text-slate-600">Füge Text ein oder lade eine Textdatei hoch. Der Entwurf wird erst nach deiner Bestätigung in das Szenario übernommen.</p><div className="mt-4 rounded-2xl border bg-amber-50 p-4 text-sm text-amber-900">Upload Light: TXT, MD, JSON und reine Textdateien. DOCX/PDF brauchen eine serverseitige Extraktionsstufe und sind noch nicht aktiv.</div><div className="mt-4 grid gap-4 md:grid-cols-3"><label className="block"><span className="mb-1 block text-sm font-semibold">Dokumenttyp</span><select className="w-full rounded-xl border p-2" value={documentType} onChange={e=>setDocumentType(e.target.value)}>{["Konzept","Projektantrag","Workshopplan","Richtlinie","Protokoll","Strategiepapier","Schulungskonzept","Sonstiges"].map(x=><option key={x}>{x}</option>)}</select></label><label className="block"><span className="mb-1 block text-sm font-semibold">Analysemodus</span><select className="w-full rounded-xl border p-2" value={analysisMode} onChange={e=>setAnalysisMode(e.target.value)}>{["vorsichtig","beratend","pre-mortem"].map(x=><option key={x}>{x}</option>)}</select></label><label className="block"><span className="mb-1 block text-sm font-semibold">Datei hochladen</span><input className="w-full rounded-xl border bg-white p-2 text-sm" type="file" accept=".txt,.md,.json,text/*" onChange={handleFile}/></label></div>{fileInfo && <div className="mt-2 text-xs text-slate-500">Geladen: {fileInfo}</div>}<textarea value={text} onChange={e=>setText(e.target.value)} className="mt-4 min-h-64 w-full rounded-2xl border p-4 text-sm" placeholder="Konzept hier einfügen. Bitte keine echten personenbezogenen Profile oder vertraulichen Klientendaten einfügen."/><div className="mt-3 flex flex-wrap gap-2"><Button dark onClick={runImport} disabled={status==="loading"||text.trim().length<80}>{status==="loading"?"Analysiere ...":"Szenarioentwurf erzeugen"}</Button>{draft&&<Button onClick={()=>setDraft(null)}>Entwurf verwerfen</Button>}</div>{err&&<div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{err}</div>}{draft&&<div className="mt-5 rounded-2xl border bg-slate-50 p-4"><h3 className="text-lg font-bold">Review vor Übernahme</h3><p className="text-sm text-slate-600">Dieser Entwurf stammt aus dem Import. Mit „Übernehmen“ wird das aktuelle Szenario ersetzt und du landest in „Ausgangslage“.</p><div className="mt-3 flex flex-wrap gap-2">{[`Annahmen ${draft.assumptions.length}`,`Personas ${draft.personas.length}`,`Ressourcen ${draft.resources.length}`,`Interventionen ${draft.interventions.length}`,`Strategien ${draft.strategies.length}`].map(c=><span key={c} className="rounded-full bg-white px-3 py-1 text-sm font-semibold">{c}</span>)}</div><div className="mt-4 grid gap-4 lg:grid-cols-2"><Mini title="Ausgangslage" text={`${draft.context.title}\n${draft.context.decisionQuestion}`}/><Mini title="Offene Fragen" text={(draft.openQuestions||[]).join("\n")}/><Mini title="Warnungen" text={(draft.warnings||[]).join("\n")}/><Mini title="Erste Annahmen" text={draft.assumptions.slice(0,5).map(a=>`${a.sourceStatus||"abgeleitet"}: ${a.text}`).join("\n")}/></div><div className="mt-4 flex gap-2"><Button dark onClick={acceptDraft}>Entwurf in Szenario übernehmen</Button><Button onClick={()=>setDraft(null)}>Nicht übernehmen</Button></div></div>}</Card>;
}

function Dashboard({ sim }) { const rows=[["Akzeptanz",sim.acceptance],["Governance",sim.governance],["Ressourcen",sim.resources],["Lernfähigkeit",sim.learning],["Restrisiko",sim.risk]]; return <Card><h2 className="text-xl font-bold">Dashboard</h2><div className="mt-4 grid gap-3 md:grid-cols-5">{rows.map(([k,v])=><div className="rounded-2xl border bg-slate-50 p-4" key={k}><div className="text-sm font-semibold text-slate-500">{k}</div><div className="text-3xl font-bold">{v}</div><div className="mt-2 h-2 rounded bg-slate-200"><div className="h-2 rounded bg-slate-900" style={{width:`${Math.max(0,Math.min(100,v))}%`}}/></div></div>)}</div><p className="mt-4 text-sm text-slate-600">Empfohlene Strategie: <b>{sim.bestStrategy?.name||"keine"}</b></p></Card> }
function Context({state,setState}){const u=(k,v)=>setState(s=>({...s,context:{...s.context,[k]:v}}));return <Card><h2 className="text-xl font-bold">Ausgangslage</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Titel" value={state.context.title} onChange={v=>u("title",v)}/><Field label="Domäne" value={state.context.domain} onChange={v=>u("domain",v)}/><div className="md:col-span-2"><Field area label="Entscheidungsfrage" value={state.context.decisionQuestion} onChange={v=>u("decisionQuestion",v)}/></div><Field area label="Ziel" value={state.context.goal} onChange={v=>u("goal",v)}/><Field area label="Grenzen" value={state.context.boundaries} onChange={v=>u("boundaries",v)}/></div></Card>}
function ListEditor({title,items,setItems,fields,blank}){const upd=(itemId,k,v)=>setItems(items.map(x=>x.id===itemId?{...x,[k]:v}:x));return <Card><div className="flex justify-between"><h2 className="text-xl font-bold">{title}</h2><Button dark onClick={()=>setItems([...items,{id:uid(),...blank}])}>+ Hinzufügen</Button></div><div className="mt-4 space-y-4">{items.map(item=><div className="rounded-2xl border bg-slate-50 p-4" key={item.id}><div className="grid gap-3 md:grid-cols-2">{fields.map(f=> f.type==="range"?<Range key={f.key} label={f.label} value={item[f.key]||3} onChange={v=>upd(item.id,f.key,v)}/>:<Field key={f.key} area={f.area} label={f.label} value={item[f.key]||""} onChange={v=>upd(item.id,f.key,v)}/>)}</div><button className="mt-3 text-sm font-bold text-rose-700" onClick={()=>setItems(items.filter(x=>x.id!==item.id))}>löschen</button></div>)}</div></Card>}
function Strategies({state,setState}){const upd=(itemId,k,v)=>setState(s=>({...s,strategies:s.strategies.map(st=>st.id===itemId?{...st,[k]:v}:st)}));const updCrit=(itemId,k,tk,v)=>setState(s=>({...s,strategies:s.strategies.map(st=>st.id===itemId?{...st,[k]:v,[tk]:criterionText(k,v)}:st)}));return <Card><h2 className="text-xl font-bold">Strategien</h2><p className="text-sm text-slate-600">Slider ändern automatisch die Begründungstexte; danach kannst du sie überschreiben.</p><div className="mt-4 space-y-4">{state.strategies.map(st=><div className="rounded-2xl border bg-slate-50 p-4" key={st.id}><Field label="Name" value={st.name} onChange={v=>upd(st.id,"name",v)}/><div className="mt-3"><Field area label="Grundidee" value={st.description} onChange={v=>upd(st.id,"description",v)}/></div><div className="mt-3 grid gap-3 lg:grid-cols-5">{[["speed","Tempo","speedText"],["acceptance","Akzeptanz","acceptanceText"],["control","Kontrolle","controlText"],["innovation","Innovation","innovationText"],["risk","Risiko","riskText"]].map(([k,l,tk])=><div className="rounded-xl border bg-white p-3" key={k}><Range label={l} value={st[k]||3} onChange={v=>updCrit(st.id,k,tk,v)}/><textarea className="mt-2 min-h-24 w-full rounded-xl border bg-slate-50 p-2 text-xs" value={st[tk]||""} onChange={e=>upd(st.id,tk,e.target.value)}/></div>)}</div><div className="mt-3 grid gap-3 md:grid-cols-3"><Field area label="Bedingungen" value={st.conditions} onChange={v=>upd(st.id,"conditions",v)}/><Field area label="Scheiternsmodus" value={st.failureMode} onChange={v=>upd(st.id,"failureMode",v)}/><Field area label="Entscheidungssignal" value={st.decisionSignal} onChange={v=>upd(st.id,"decisionSignal",v)}/></div></div>)}</div></Card>}
function Report({state,sim}){const [status,setStatus]=useState("local"),[gpt,setGpt]=useState(null);async function run(){setStatus("loading");try{const r=await fetch("/api/simulate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({state})});if(!r.ok)throw new Error(await r.text());setGpt(await r.json());setStatus("done")}catch(e){setStatus("error")}}const sections=gpt?Object.entries(gpt).map(([k,v])=>[reportTitle(k),v]):[["Executive Summary",`${state.context.title}\nAkzeptanz ${sim.acceptance}, Governance ${sim.governance}, Ressourcen ${sim.resources}, Restrisiko ${sim.risk}.`],["Ressourcenengpässe",sim.deficits.map(r=>`${r.name}: ${r.bottleneck}`).join("\n")||"keine"],["Riskante Annahmen",sim.risky.map(a=>a.text).join("\n")||"keine"],["Strategie",sim.bestStrategy?.name||"keine"]];return <Card><div className="flex justify-between"><h2 className="text-xl font-bold">Report</h2><div className="flex gap-2"><Button onClick={run}>GPT-Report</Button><Button dark onClick={()=>navigator.clipboard?.writeText(sections.map(([a,b])=>`${a}\n${b}`).join("\n\n"))}>Kopieren</Button></div></div><p className="mt-2 text-sm text-slate-500">Status: {status}</p><div className="mt-4 grid gap-3 md:grid-cols-2">{sections.map(([k,v])=><div className="rounded-2xl border bg-slate-50 p-4" key={k}><b>{k}</b><p className="mt-2 whitespace-pre-line text-sm">{String(v)}</p></div>)}</div></Card>}
function Storage({state,setState,saved,setSaved}){const [name,setName]=useState(state.context.title);function save(){const item={id:uid(),name:name||state.context.title,date:new Date().toISOString(),state};const next=[item,...saved];setSaved(next);persistSaved(next)}function load(item){setState(item.state)}function duplicate(item){const copy={id:uid(),name:item.name+" Kopie",date:new Date().toISOString(),state:item.state};const next=[copy,...saved];setSaved(next);persistSaved(next)}function del(itemId){const next=saved.filter(x=>x.id!==itemId);setSaved(next);persistSaved(next)}return <Card><h2 className="text-xl font-bold">Speichern und Laden</h2><div className="mt-4 flex gap-2"><input className="flex-1 rounded-xl border p-2" value={name} onChange={e=>setName(e.target.value)}/><Button dark onClick={save}>Aktuelles Szenario speichern</Button></div><div className="mt-4 space-y-3">{saved.map(item=><div className="rounded-2xl border bg-slate-50 p-4" key={item.id}><b>{item.name}</b><div className="text-xs text-slate-500">{new Date(item.date).toLocaleString()}</div><div className="mt-2 flex gap-2"><Button onClick={()=>load(item)}>Laden</Button><Button onClick={()=>duplicate(item)}>Duplizieren</Button><Button onClick={()=>del(item.id)}>Löschen</Button></div></div>)}</div></Card>}
function Compare({saved}){const [a,setA]=useState(""),[b,setB]=useState("");const A=saved.find(x=>x.id===a)?.state,B=saved.find(x=>x.id===b)?.state;const ca=A?compute(A):null,cb=B?compute(B):null;return <Card><h2 className="text-xl font-bold">Vergleich</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><select className="rounded-xl border p-2" value={a} onChange={e=>setA(e.target.value)}><option value="">Simulation A wählen</option>{saved.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><select className="rounded-xl border p-2" value={b} onChange={e=>setB(e.target.value)}><option value="">Simulation B wählen</option>{saved.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>{ca&&cb&&<div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Kriterium</th><th>A</th><th>B</th><th>Delta</th></tr></thead><tbody>{[["Akzeptanz","acceptance"],["Governance","governance"],["Ressourcen","resources"],["Lernfähigkeit","learning"],["Restrisiko","risk"]].map(([l,k])=><tr className="border-t" key={k}><td className="p-2 font-semibold">{l}</td><td>{ca[k]}</td><td>{cb[k]}</td><td>{cb[k]-ca[k]}</td></tr>)}</tbody></table><div className="mt-4 grid gap-3 md:grid-cols-2"><Mini title="Neue/andere Annahmen B" text={B.assumptions.map(x=>x.text).filter(t=>!A.assumptions.map(y=>y.text).includes(t)).join("\n")||"keine"}/><Mini title="Strategien" text={`A: ${ca.bestStrategy?.name||"-"}\nB: ${cb.bestStrategy?.name||"-"}`}/></div></div>}</Card>}

const tabs=["Dashboard","Vorlagen","Import","Ausgangslage","Annahmen","Personas","Ressourcen","Interventionen","Strategien","Report","Speicher","Vergleich"];
export default function App(){const [state,setState]=useState(initialScenario);const [tab,setTab]=useState("Vorlagen");const [saved,setSaved]=useState([]);useEffect(()=>setSaved(loadSaved()),[]);const sim=useMemo(()=>compute(state),[state]);const set=(key,val)=>setState(s=>({...s,[key]:val}));const views={Dashboard:<Dashboard sim={sim}/>,Vorlagen:<TemplatesPanel setState={setState} setTab={setTab}/>,Import:<ImportPanel setState={setState} setTab={setTab}/>,Ausgangslage:<Context state={state} setState={setState}/>,Annahmen:<ListEditor title="Annahmen" items={state.assumptions} setItems={v=>set("assumptions",v)} blank={{text:"",source:"manuell",evidence:"niedrig",uncertainty:"mittel",sensitivity:"intern"}} fields={[{key:"text",label:"Annahme",area:true},{key:"source",label:"Quelle"},{key:"evidence",label:"Evidenz"},{key:"uncertainty",label:"Unsicherheit"},{key:"sensitivity",label:"Sensibilität"},{key:"sourceStatus",label:"Status"}]}/>,Personas:<ListEditor title="Personas" items={state.personas} setItems={v=>set("personas",v)} blank={{name:"Neue Rolle",role:"Stakeholder",stance:"unklar",influence:3,affectedness:3,trust:3,aiLiteracy:3,riskSense:3,changeEnergy:3}} fields={[{key:"name",label:"Name"},{key:"role",label:"Rolle"},{key:"stance",label:"Haltung"},{key:"influence",label:"Einfluss",type:"range"},{key:"affectedness",label:"Betroffenheit",type:"range"},{key:"trust",label:"Vertrauen",type:"range"},{key:"aiLiteracy",label:"KI-Kompetenz",type:"range"},{key:"riskSense",label:"Risikoempfinden",type:"range"},{key:"changeEnergy",label:"Veränderungsenergie",type:"range"},{key:"trigger",label:"Trigger",area:true},{key:"communicationNeed",label:"Kommunikationsbedarf",area:true}]}/>,Ressourcen:<ListEditor title="Ressourcen" items={state.resources} setItems={v=>set("resources",v)} blank={{name:"Neue Ressource",type:"sozial",current:3,target:4,direction:"high_good",trend:"stabil",bottleneck:"",owner:""}} fields={[{key:"name",label:"Ressource"},{key:"type",label:"Typ"},{key:"direction",label:"Logik"},{key:"trend",label:"Trend"},{key:"current",label:"Aktuell",type:"range"},{key:"target",label:"Ziel",type:"range"},{key:"bottleneck",label:"Engpass",area:true},{key:"owner",label:"Beobachten / Verantwortlich",area:true}]}/>,Interventionen:<ListEditor title="Interventionen" items={state.interventions} setItems={v=>set("interventions",v)} blank={{name:"Neue Intervention",timing:"offen",target:"",benefit:"",sideEffect:"",effort:"mittel"}} fields={[{key:"name",label:"Name"},{key:"timing",label:"Zeitpunkt"},{key:"target",label:"Ziel"},{key:"benefit",label:"Nutzen",area:true},{key:"sideEffect",label:"Nebenwirkung",area:true},{key:"effort",label:"Aufwand"}]}/>,Strategien:<Strategies state={state} setState={setState}/>,Report:<Report state={state} sim={sim}/>,Speicher:<Storage state={state} setState={setState} saved={saved} setSaved={setSaved}/>,Vergleich:<Compare saved={saved}/>};return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8"><div className="mx-auto max-w-7xl space-y-5"><header className="rounded-3xl bg-slate-950 p-8 text-white"><div className="mb-3 inline-flex rounded-full border border-white/20 px-3 py-1 text-sm">KI-Kernel GPT 0.4</div><h1 className="text-4xl font-bold">Szenarioentwurf, Standardszenarien, Upload Light, Speicher und Vergleich</h1><p className="mt-3 max-w-3xl text-slate-300">Vorlage laden oder Konzept importieren, Szenario prüfen, nachjustieren, simulieren, speichern und vergleichen.</p><div className="mt-5 flex gap-3"><Button onClick={()=>{setState(withIds(standardScenarios[0]));setTab("Ausgangslage")}}>Demo neu laden</Button><a className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold" href="/hilfe.html" target="_blank" rel="noreferrer">Hilfe öffnen</a></div></header><nav className="sticky top-2 z-10 overflow-x-auto rounded-2xl border bg-white/90 p-2 shadow-sm backdrop-blur"><div className="flex min-w-max gap-2">{tabs.map(t=><button key={t} onClick={()=>setTab(t)} className={`rounded-xl px-3 py-2 text-sm font-bold ${tab===t?"bg-slate-900 text-white":"text-slate-600 hover:bg-slate-100"}`}>{t}</button>)}<a href="/hilfe.html" target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Hilfe</a></div></nav>{views[tab]}<footer className="rounded-2xl border bg-white p-4 text-xs text-slate-500">Standardszenarien sind aus der hochgeladenen ZIP fachlich adaptiert. Speicherung erfolgt aktuell lokal im Browser. Originaldokumente werden nicht serverseitig gespeichert. Keine echten personenbezogenen Profile verwenden.</footer></div></main>}
