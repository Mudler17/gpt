import React, { useMemo, useState } from "react";
import App8 from "./App8.jsx";

const modules = [
  {
    id: "modellierung",
    title: "Szenario",
    group: "Kernarbeit",
    description: "Hauptarbeitsbereich für Vorlagen, Import Light, Ausgangslage, Annahmen, Personas, Ressourcen, Interventionen, Strategien, Report, Speicher und Vergleich.",
    type: "react"
  },
  {
    id: "import",
    title: "Import+",
    group: "Eingabe",
    description: "Erweiterter Dokumentimport für TXT, MD, JSON, PDF und DOCX mit Übergabe in die Haupt-App.",
    path: "/import-plus.html"
  },
  {
    id: "beratung",
    title: "Beratung",
    group: "Beratung",
    description: "Persönlicher Beratungsarbeitsplatz mit Fallakte, Notizen, To-dos, Journal und Beratungsdossier.",
    path: "/beratung.html"
  },
  {
    id: "bericht",
    title: "Bericht+",
    group: "Output",
    description: "Arbeitsreport und Management-Briefing aus gespeicherten Szenarien erzeugen.",
    path: "/bericht-plus.html"
  },
  {
    id: "vergleich",
    title: "Vergleich+",
    group: "Simulation",
    description: "Beratungsfähiger A/B/C-Vergleich gespeicherter Szenarien mit Zielkonfliktanalyse.",
    path: "/vergleich-plus.html"
  },
  {
    id: "phasen",
    title: "Phasen",
    group: "Simulation",
    description: "Phasenmodell mit Ressourcenverlauf, Kipppunkten und Phasenbericht.",
    path: "/phasenmodell.html"
  },
  {
    id: "beziehungen",
    title: "Beziehungen",
    group: "Simulation",
    description: "Beziehungsmodell mit Koalitionen, Konfliktachsen, Brückenrollen und isolierten Rollen.",
    path: "/beziehungsmodell.html"
  },
  {
    id: "hilfe",
    title: "Hilfe",
    group: "Service",
    description: "Aktuelle Hilfeseite, Bedienlogik, Hinweise und Fehlerhilfe.",
    path: "/hilfe.html"
  }
];

function groupedModules() {
  const groups = [];
  for (const module of modules) {
    let group = groups.find((g) => g.name === module.group);
    if (!group) {
      group = { name: module.group, items: [] };
      groups.push(group);
    }
    group.items.push(module);
  }
  return groups;
}

function ModuleFrame({ module }) {
  if (module.type === "react") {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <App8 />
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 bg-white p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Modul</div>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{module.title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{module.description}</p>
          </div>
          <a
            className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-100"
            href={module.path}
            target="_blank"
            rel="noreferrer"
          >
            In neuem Tab öffnen
          </a>
        </div>
      </div>
      <iframe
        title={module.title}
        src={module.path}
        className="h-[78vh] w-full border-0 bg-white"
      />
    </section>
  );
}

export default function App15() {
  const [activeId, setActiveId] = useState("modellierung");
  const active = modules.find((m) => m.id === activeId) || modules[0];
  const groups = useMemo(() => groupedModules(), []);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
          <div className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-bold text-slate-300">
            KI-Kernel GPT 1.0 · integrierte App-Shell
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">Beratungsfähiger Organisationssimulator</h1>
              <p className="mt-3 max-w-4xl text-base leading-7 text-slate-300">
                Die einzelnen Werkzeuge sind jetzt in einer gemeinsamen Oberfläche gebündelt. Statt gestapelter Floating-Buttons steuerst du die App über eine zentrale Modulnavigation.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Aktives Modul</div>
              <div className="mt-1 text-2xl font-black">{active.title}</div>
              <p className="mt-1 text-sm leading-6 text-slate-300">{active.description}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-5 px-4 py-5 md:px-8 lg:grid-cols-[290px_1fr]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <nav className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">Module</div>
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.name}>
                  <div className="px-3 pb-1 text-xs font-black uppercase tracking-wide text-slate-500">{group.name}</div>
                  <div className="space-y-1">
                    {group.items.map((module) => (
                      <button
                        key={module.id}
                        onClick={() => setActiveId(module.id)}
                        className={`w-full rounded-2xl px-3 py-3 text-left text-sm font-extrabold transition ${
                          activeId === module.id
                            ? "bg-slate-950 text-white shadow-sm"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div>{module.title}</div>
                        <div className={`mt-1 text-xs font-semibold leading-4 ${activeId === module.id ? "text-slate-300" : "text-slate-400"}`}>
                          {module.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <div className="font-black">Konsolidierungsstand</div>
            <p className="mt-1">
              Die Oberfläche ist integriert. Einige Module laufen noch als eingebettete Kompatibilitätsseiten und werden im nächsten Schritt schrittweise als native React-Module migriert.
            </p>
          </section>
        </aside>

        <section className="min-w-0">
          <ModuleFrame module={active} />
        </section>
      </div>
    </main>
  );
}
