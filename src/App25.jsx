import React, { useMemo, useState } from "react";
import App20 from "./App20.jsx";

const LOCAL_SCENARIOS_KEY = "ki-kernel-szenarien-v8";

function nowIso() { return new Date().toISOString(); }
function validDate(value) { if (!value) return false; const d = new Date(value); return !Number.isNaN(d.getTime()); }
function dateMs(value) { return validDate(value) ? new Date(value).getTime() : 0; }
function normalizeTitle(value = "") {
  return String(value || "")
    .replace(/· DB-Restore Kopie/gi, "")
    .replace(/· DB-Restore/gi, "")
    .replace(/· Sicherung vor DB-Aktualisierung/gi, "")
    .replace(/^Import\+\s*·\s*/i, "")
    .trim()
    .toLowerCase();
}
function scenarioTitle(item = {}) { return item.name || item.title || item?.state?.context?.title || "Unbenanntes Szenario"; }
function isDbVariant(item = {}) { return /db-restore kopie/i.test(String(item.name || "")) || item.variantOfOrigin === "database" || item.localVariantOfOriginScenarioId; }
function localOrigin(item = {}) {
  if (item.localBackupOf || /sicherung vor db-aktualisierung/i.test(item.name || "")) return "lokale Sicherung";
  if (isDbVariant(item)) return "lokale DB-Variante";
  if (item.source === "database" || item.restoredAt || /db-restore/i.test(item.name || "")) return "DB-Restore";
  if (/^Import\+/.test(item.name || "")) return "Import+ lokal";
  return "lokal";
}
function normalizeScenarioDates(item) {
  const fallback = nowIso();
  const date = validDate(item?.date) ? item.date : validDate(item?.savedAt) ? item.savedAt : validDate(item?.updatedAt) ? item.updatedAt : validDate(item?.restoredAt) ? item.restoredAt : validDate(item?.createdAt) ? item.createdAt : fallback;
  const next = { ...item, date, savedAt: validDate(item?.savedAt) ? item.savedAt : date, createdAt: validDate(item?.createdAt) ? item.createdAt : date, updatedAt: validDate(item?.updatedAt) ? item.updatedAt : date };
  if (isDbVariant(next) && !next.localVariantOfOriginScenarioId) {
    next.variantOfOrigin = "database";
    next.localVariantOfOriginScenarioId = next.originScenarioId || next.id || null;
    next.source = next.source || "local-variant";
  }
  return next;
}
function readLocalScenarios() {
  try { const parsed = JSON.parse(localStorage.getItem(LOCAL_SCENARIOS_KEY) || "[]"); return Array.isArray(parsed) ? parsed.map(normalizeScenarioDates) : []; } catch { return []; }
}
function writeLocalScenarios(items) { localStorage.setItem(LOCAL_SCENARIOS_KEY, JSON.stringify(items.map(normalizeScenarioDates))); }
function repairLocalScenarioDates() { writeLocalScenarios(readLocalScenarios()); }
async function getJson(url) { const res = await fetch(url, { cache: "no-store" }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || res.statusText); return data; }
function makeRestoredScenario(pack, detail, previous = null) {
  const timestamp = nowIso();
  const dbUpdatedAt = detail?.scenario?.updated_at || detail?.scenario?.updatedAt || pack?.updatedAt || timestamp;
  return normalizeScenarioDates({
    ...pack,
    id: pack.id || detail?.scenario?.id || `db_${Date.now()}`,
    name: `${pack.name || detail?.scenario?.title || "DB-Szenario"} · DB-Restore`,
    source: "database",
    origin: "database",
    originScenarioId: pack.id || detail?.scenario?.id,
    originUpdatedAt: dbUpdatedAt,
    previousLocalUpdatedAt: previous?.updatedAt || previous?.date || null,
    date: timestamp,
    savedAt: timestamp,
    restoredAt: timestamp,
    updatedAt: timestamp,
    createdAt: validDate(pack.createdAt) ? pack.createdAt : timestamp
  });
}
function makeLocalBackup(item) {
  const timestamp = nowIso();
  return normalizeScenarioDates({ ...item, id: `${item.id || "local"}_backup_${Date.now()}`, name: `${scenarioTitle(item)} · Sicherung vor DB-Aktualisierung`, localBackupOf: item.id || null, backupCreatedAt: timestamp, date: timestamp, savedAt: timestamp, updatedAt: timestamp });
}
function buildRows(localItems, dbItems) {
  const keys = new Map();
  localItems.forEach((item) => {
    const idKey = item.id ? `id:${item.id}` : null;
    const titleKey = `title:${normalizeTitle(scenarioTitle(item))}`;
    const key = dbItems.some((db) => db.id === item.id) ? idKey : titleKey;
    if (!keys.has(key)) keys.set(key, { key, local: [], db: [] });
    keys.get(key).local.push(item);
  });
  dbItems.forEach((item) => {
    const idKey = item.id ? `id:${item.id}` : null;
    const titleKey = `title:${normalizeTitle(item.title || item.name)}`;
    const key = localItems.some((local) => local.id === item.id) ? idKey : titleKey;
    if (!keys.has(key)) keys.set(key, { key, local: [], db: [] });
    keys.get(key).db.push(item);
  });
  return [...keys.values()].map((row) => {
    const local = row.local[0];
    const db = row.db[0];
    const hasLocal = row.local.length > 0;
    const hasDb = row.db.length > 0;
    const restored = row.local.some((x) => localOrigin(x) === "DB-Restore");
    const localVariant = row.local.some((x) => localOrigin(x) === "lokale DB-Variante");
    const duplicateLocal = row.local.length > 1;
    const directLocal = row.local.find((x) => localOrigin(x) === "DB-Restore") || local;
    const dbNewer = hasLocal && hasDb && restored && dateMs(db?.updated_at || db?.updatedAt) > dateMs(directLocal?.originUpdatedAt || directLocal?.restoredAt || directLocal?.updatedAt);
    const localEdited = (restored || localVariant) && dateMs(local?.updatedAt) > dateMs(local?.restoredAt) + 1000;
    let status = "Nur lokal";
    let tone = "warn";
    if (hasLocal && hasDb && restored) { status = dbNewer ? "DB neuer" : "DB-Restore vorhanden"; tone = dbNewer ? "warn" : "ok"; }
    else if (hasLocal && hasDb && localVariant) { status = "Lokale DB-Variante"; tone = "warn"; }
    else if (hasLocal && hasDb) { status = "Lokal und DB"; tone = "info"; }
    else if (!hasLocal && hasDb) { status = "Nur DB"; tone = "info"; }
    else if (hasLocal && !hasDb && localVariant) { status = "Lokale DB-Variante"; tone = "warn"; }
    if (localEdited) status += " · lokal bearbeitet";
    if (duplicateLocal) status += " · lokale Doppelung";
    return { ...row, title: db?.title || db?.name || scenarioTitle(local), hasLocal, hasDb, restored, localVariant, duplicateLocal, dbNewer, localEdited, status, tone };
  }).sort((a, b) => a.title.localeCompare(b.title, "de"));
}
function pillStyle(tone = "info") {
  const base = { display: "inline-flex", alignItems: "center", border: "1px solid", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 850 };
  if (tone === "ok") return { ...base, background: "#ecfdf5", borderColor: "#bbf7d0", color: "#065f46" };
  if (tone === "warn") return { ...base, background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" };
  if (tone === "bad") return { ...base, background: "#fff1f2", borderColor: "#fecdd3", color: "#9f1239" };
  return { ...base, background: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af" };
}
function Pill({ children, tone = "info" }) { return <span style={pillStyle(tone)}>{children}</span>; }

function ModuleDrawer({ open, setOpen, active, setActive, onOpenDb }) {
  const menu = [
    { id: "database", label: "Datenbank", hint: "DB-Szenarien lesen und aktualisieren", action: onOpenDb },
    { id: "projects", label: "Projektakte", hint: "Projektansicht öffnen", href: "/projekte.html" },
    { id: "backup", label: "Backup", hint: "Export und Import", href: "/backup.html" },
    { id: "db-viewer", label: "DB-Prüfung", hint: "Datenbankbestand prüfen", href: "/db-viewer.html" },
    { id: "db-setup", label: "DB-Setup", hint: "Datenbank einrichten", href: "/db-setup.html" },
    { id: "help", label: "Hilfe", hint: "Anleitung öffnen", href: "/hilfe.html" }
  ];
  return (
    <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 140, width: open ? 286 : 54, background: "#020617", color: "white", borderRight: "1px solid rgba(255,255,255,.12)", transition: "width .18s ease", boxShadow: open ? "18px 0 50px rgba(15,23,42,.22)" : "none" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", height: 56, border: 0, borderBottom: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "white", cursor: "pointer", fontWeight: 950, fontSize: 15, textAlign: open ? "left" : "center", padding: open ? "0 18px" : 0 }}>{open ? "Module" : "☰"}</button>
      {open && <div style={{ padding: 12 }}>
        {menu.map((item) => {
          const body = <><div style={{ fontWeight: 950 }}>{item.label}</div><div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{item.hint}</div></>;
          const style = { display: "block", width: "100%", boxSizing: "border-box", textAlign: "left", border: "1px solid rgba(255,255,255,.10)", borderRadius: 14, background: active === item.id ? "#1e293b" : "transparent", color: "white", padding: "11px 12px", marginBottom: 8, cursor: "pointer", textDecoration: "none" };
          if (item.href) return <a key={item.id} href={item.href} target="_blank" rel="noreferrer" style={style}>{body}</a>;
          return <button key={item.id} onClick={() => { setActive(item.id); item.action?.(); }} style={style}>{body}</button>;
        })}
      </div>}
    </aside>
  );
}

export default function App25() {
  useMemo(() => repairLocalScenarioDates(), []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeModule, setActiveModule] = useState("");
  const [dbPanelOpen, setDbPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState(null);
  const [dbScenarios, setDbScenarios] = useState([]);
  const [localScenarios, setLocalScenarios] = useState(() => readLocalScenarios());
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [lastAction, setLastAction] = useState("");

  const conflictRows = useMemo(() => buildRows(localScenarios, dbScenarios), [localScenarios, dbScenarios]);
  const conflictSummary = useMemo(() => ({
    local: localScenarios.length,
    db: dbScenarios.length,
    restored: conflictRows.filter((x) => x.restored).length,
    variants: conflictRows.filter((x) => x.localVariant).length,
    onlyLocal: conflictRows.filter((x) => x.hasLocal && !x.hasDb && !x.localVariant).length,
    onlyDb: conflictRows.filter((x) => !x.hasLocal && x.hasDb).length,
    dbNewer: conflictRows.filter((x) => x.dbNewer).length,
    localEdited: conflictRows.filter((x) => x.localEdited).length,
    duplicates: conflictRows.filter((x) => x.duplicateLocal).length
  }), [conflictRows, localScenarios.length, dbScenarios.length]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? dbScenarios.filter((s) => JSON.stringify(s).toLowerCase().includes(q)) : dbScenarios;
  }, [dbScenarios, query]);

  function refreshLocal() { repairLocalScenarioDates(); setLocalScenarios(readLocalScenarios()); setLastAction("Lokaler Speicher wurde geprüft."); }
  async function loadDbScenarios() {
    setDbPanelOpen(true); setLoading(true); setError(""); setLastAction("");
    try {
      repairLocalScenarioDates();
      const [h, scenarios] = await Promise.all([getJson("/api/health"), getJson("/api/db/scenarios")]);
      setHealth(h); setDbScenarios(scenarios.items || []); setLocalScenarios(readLocalScenarios());
    } catch (e) { setError(e.message || String(e)); } finally { setLoading(false); }
  }
  async function loadDetail(id) {
    setLoading(true); setError(""); setLastAction("");
    try { setSelected(await getJson(`/api/db/scenarios/${encodeURIComponent(id)}`)); } catch (e) { setError(e.message || String(e)); } finally { setLoading(false); }
  }
  async function updateLocalFromDb(scenarioId, { createBackup = true } = {}) {
    setLoading(true); setError(""); setLastAction("");
    try {
      const detail = await getJson(`/api/db/scenarios/${encodeURIComponent(scenarioId)}`);
      const pack = detail.localStoragePackage;
      if (!pack) throw new Error("Kein Restore-Paket vorhanden.");
      const existing = readLocalScenarios();
      const previous = existing.find((x) => x.id === pack.id || normalizeTitle(scenarioTitle(x)) === normalizeTitle(detail.scenario?.title || pack.name));
      if (!window.confirm(previous ? "Direkte lokale DB-Kopie aktualisieren? Lokale Varianten bleiben geschützt." : "DB-Szenario lokal übernehmen?")) return;
      const withBackup = previous && createBackup && window.confirm("Vor dem Überschreiben eine Sicherungskopie anlegen?");
      const restored = makeRestoredScenario(pack, detail, previous);
      const remaining = existing.filter((x) => {
        const sameDirect = x.id === restored.id || (normalizeTitle(scenarioTitle(x)) === normalizeTitle(detail.scenario?.title || restored.name) && localOrigin(x) !== "lokale DB-Variante");
        return !sameDirect;
      });
      const next = [restored, ...(withBackup ? [makeLocalBackup(previous)] : []), ...remaining];
      writeLocalScenarios(next); setLocalScenarios(next); setSelected(detail); setLastAction(previous ? "Direkte lokale DB-Kopie wurde aktualisiert. Varianten blieben erhalten." : "DB-Szenario wurde lokal übernommen.");
    } catch (e) { setError(e.message || String(e)); } finally { setLoading(false); }
  }

  return (
    <>
      <App20 />
      <ModuleDrawer open={drawerOpen} setOpen={setDrawerOpen} active={activeModule} setActive={setActiveModule} onOpenDb={loadDbScenarios} />
      {dbPanelOpen && <div style={{ position: "fixed", left: drawerOpen ? 306 : 74, top: 24, bottom: 24, width: "min(900px, calc(100vw - 110px))", zIndex: 125, overflow: "auto", background: "#fff", color: "#0f172a", border: "1px solid #dbe3ee", borderRadius: 24, boxShadow: "0 24px 80px rgba(15,23,42,.28)", padding: 18, fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div><h2 style={{ margin: 0, fontSize: 24 }}>Datenbank-Szenarien</h2><p style={{ margin: "6px 0 0", color: "#475569" }}>DB-Szenarien lesen, direkte lokale Kopien aktualisieren und lokale Varianten schützen.</p></div>
          <button onClick={() => setDbPanelOpen(false)} style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: "white", padding: "8px 10px", cursor: "pointer", fontWeight: 900 }}>Schließen</button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <button onClick={loadDbScenarios} style={{ border: "1px solid #020617", borderRadius: 14, background: "#020617", color: "white", padding: "10px 12px", cursor: "pointer", fontWeight: 900 }}>DB-Liste aktualisieren</button>
          <button onClick={refreshLocal} style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "white", color: "#0f172a", padding: "10px 12px", cursor: "pointer", fontWeight: 900 }}>Lokalen Speicher prüfen</button>
          {health && <Pill tone={health.storageMode === "local" ? "ok" : "warn"}>Speicher: {health.storageMode}</Pill>}
          {health && <Pill tone={health.databaseConfigured ? "ok" : "bad"}>DB verbunden: {String(health.databaseConfigured)}</Pill>}
        </div>
        <div style={{ marginTop: 14, border: "1px solid #e2e8f0", borderRadius: 18, background: "#f8fafc", padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Herkunft und Konflikte</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Pill>lokal: {conflictSummary.local}</Pill><Pill>Datenbank: {conflictSummary.db}</Pill><Pill tone="ok">DB-Restore: {conflictSummary.restored}</Pill><Pill tone={conflictSummary.variants ? "warn" : "ok"}>lokale DB-Varianten: {conflictSummary.variants}</Pill><Pill tone={conflictSummary.onlyLocal ? "warn" : "ok"}>nur lokal: {conflictSummary.onlyLocal}</Pill><Pill tone={conflictSummary.onlyDb ? "info" : "ok"}>nur DB: {conflictSummary.onlyDb}</Pill><Pill tone={conflictSummary.dbNewer ? "warn" : "ok"}>DB neuer: {conflictSummary.dbNewer}</Pill><Pill tone={conflictSummary.localEdited ? "warn" : "ok"}>lokal bearbeitet: {conflictSummary.localEdited}</Pill><Pill tone={conflictSummary.duplicates ? "warn" : "ok"}>Doppelungen: {conflictSummary.duplicates}</Pill>
          </div>
        </div>
        {loading && <p style={{ color: "#64748b" }}>Lade...</p>}
        {error && <div style={{ marginTop: 12, border: "1px solid #fecdd3", background: "#fff1f2", color: "#9f1239", borderRadius: 16, padding: 12, fontWeight: 800 }}>{error}</div>}
        {lastAction && <div style={{ marginTop: 12, border: "1px solid #bbf7d0", background: "#ecfdf5", color: "#065f46", borderRadius: 16, padding: 12, fontWeight: 800 }}>{lastAction}</div>}
        <div style={{ marginTop: 14 }}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="DB-Szenarien filtern..." style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 14, padding: "11px 12px", fontSize: 15 }} /></div>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {conflictRows.slice(0, 10).map((row) => <div key={row.key} style={{ border: "1px solid #e2e8f0", borderRadius: 16, background: "white", padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}><div><div style={{ fontWeight: 900 }}>{row.title}</div><div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>lokal: {row.local.map((x) => `${scenarioTitle(x)} (${localOrigin(x)})`).join(", ") || "—"} · DB: {row.db.map((x) => x.title).join(", ") || "—"}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}><Pill tone={row.tone}>{row.status}</Pill>{row.localVariant && <Pill tone="warn">Variante schützen</Pill>}{row.localEdited && <Pill tone="warn">lokale Bearbeitung schützen</Pill>}{row.dbNewer && <Pill tone="warn">DB-Version neuer</Pill>}</div></div>{row.hasDb && <button onClick={() => updateLocalFromDb(row.db[0].id)} style={{ border: "1px solid #020617", borderRadius: 14, background: "#020617", color: "white", padding: "9px 11px", cursor: "pointer", fontWeight: 900, whiteSpace: "nowrap" }}>{row.hasLocal ? "Direkten Restore aktualisieren" : "Aus DB übernehmen"}</button>}</div></div>)}
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {filtered.map((s) => { const localMatch = localScenarios.find((x) => x.id === s.id || normalizeTitle(scenarioTitle(x)) === normalizeTitle(s.title)); return <div key={s.id} style={{ border: "1px solid #e2e8f0", borderRadius: 18, padding: 14, background: "#f8fafc" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}><div><div style={{ fontWeight: 950 }}>{s.title}</div><div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{s.description || s.name || s.id}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}><Pill tone={s.project_count === 0 ? "warn" : "info"}>Projekte: {s.project_count}</Pill><Pill>Versionen: {s.version_count}</Pill><Pill>Datenbank</Pill>{localMatch ? <Pill tone={localOrigin(localMatch) === "DB-Restore" ? "ok" : "warn"}>lokal: {localOrigin(localMatch)}</Pill> : <Pill>nur DB</Pill>}</div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}><button onClick={() => loadDetail(s.id)} style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "white", padding: "9px 11px", cursor: "pointer", fontWeight: 900 }}>Details</button><button onClick={() => updateLocalFromDb(s.id)} style={{ border: "1px solid #020617", borderRadius: 14, background: "#020617", color: "white", padding: "9px 11px", cursor: "pointer", fontWeight: 900 }}>{localMatch ? "Direkten Restore aktualisieren" : "Übernehmen"}</button></div></div></div>; })}
        </div>
        {selected && <div style={{ marginTop: 16, border: "1px solid #dbe3ee", borderRadius: 20, padding: 16, background: "#fff" }}><h3 style={{ margin: "0 0 8px" }}>{selected.scenario?.title}</h3><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{(selected.projects || []).length ? selected.projects.map((p) => <Pill key={p.id}>{p.title} · {p.relation_type || "contains"}</Pill>) : <Pill tone="warn">nicht zugeordnet</Pill>}<Pill tone={selected.localStoragePackage ? "ok" : "bad"}>Restore-Paket: {selected.localStoragePackage ? "ja" : "nein"}</Pill></div><p style={{ color: "#475569", fontSize: 14 }}>Dieses Szenario kann als direkte DB-Restore-Kopie aktualisiert werden. Lokale Varianten bleiben geschützt.</p><button onClick={() => updateLocalFromDb(selected.scenario?.id)} disabled={!selected.localStoragePackage} style={{ border: "1px solid #020617", borderRadius: 14, background: selected.localStoragePackage ? "#020617" : "#cbd5e1", color: "white", padding: "10px 12px", cursor: selected.localStoragePackage ? "pointer" : "not-allowed", fontWeight: 900 }}>Direkten Restore aktualisieren/übernehmen</button></div>}
      </div>}
    </>
  );
}
