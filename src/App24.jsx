import React, { useMemo, useState } from "react";
import App23 from "./App23.jsx";

const LOCAL_SCENARIOS_KEY = "ki-kernel-szenarien-v8";

function nowIso() {
  return new Date().toISOString();
}

function validDate(value) {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function dateMs(value) {
  if (!validDate(value)) return 0;
  return new Date(value).getTime();
}

function normalizeTitle(value = "") {
  return String(value || "")
    .replace(/· DB-Restore/gi, "")
    .replace(/· Sicherung vor DB-Aktualisierung/gi, "")
    .replace(/^Import\+\s*·\s*/i, "")
    .trim()
    .toLowerCase();
}

function scenarioTitle(item = {}) {
  return item.name || item.title || item?.state?.context?.title || "Unbenanntes Szenario";
}

function localOrigin(item = {}) {
  if (item.localBackupOf || /sicherung vor db-aktualisierung/i.test(item.name || "")) return "lokale Sicherung";
  if (item.source === "database" || item.restoredAt || /db-restore/i.test(item.name || "")) return "DB-Restore";
  if (/^Import\+/.test(item.name || "")) return "Import+ lokal";
  return "lokal";
}

function normalizeScenarioDates(item) {
  const fallback = nowIso();
  const date = validDate(item?.date) ? item.date
    : validDate(item?.savedAt) ? item.savedAt
    : validDate(item?.updatedAt) ? item.updatedAt
    : validDate(item?.restoredAt) ? item.restoredAt
    : validDate(item?.createdAt) ? item.createdAt
    : fallback;
  return {
    ...item,
    date,
    savedAt: validDate(item?.savedAt) ? item.savedAt : date,
    createdAt: validDate(item?.createdAt) ? item.createdAt : date,
    updatedAt: validDate(item?.updatedAt) ? item.updatedAt : date
  };
}

function repairLocalScenarioDates() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_SCENARIOS_KEY) || "[]");
    if (!Array.isArray(raw)) return;
    let changed = false;
    const repaired = raw.map((item) => {
      const next = normalizeScenarioDates(item || {});
      if (next.date !== item?.date || next.savedAt !== item?.savedAt || next.createdAt !== item?.createdAt || next.updatedAt !== item?.updatedAt) changed = true;
      return next;
    });
    if (changed) localStorage.setItem(LOCAL_SCENARIOS_KEY, JSON.stringify(repaired));
  } catch {
    // no-op
  }
}

function toneStyle(tone) {
  if (tone === "ok") return { background: "#ecfdf5", borderColor: "#bbf7d0", color: "#065f46" };
  if (tone === "warn") return { background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" };
  if (tone === "bad") return { background: "#fff1f2", borderColor: "#fecdd3", color: "#9f1239" };
  return { background: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af" };
}

function Pill({ children, tone = "info" }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      border: "1px solid",
      borderRadius: 999,
      padding: "3px 8px",
      fontSize: 12,
      fontWeight: 800,
      ...toneStyle(tone)
    }}>{children}</span>
  );
}

async function getJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function readLocalScenarios() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_SCENARIOS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeScenarioDates) : [];
  } catch {
    return [];
  }
}

function writeLocalScenarios(items) {
  localStorage.setItem(LOCAL_SCENARIOS_KEY, JSON.stringify(items.map(normalizeScenarioDates)));
}

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
  return normalizeScenarioDates({
    ...item,
    id: `${item.id || "local"}_backup_${Date.now()}`,
    name: `${scenarioTitle(item)} · Sicherung vor DB-Aktualisierung`,
    source: item.source || "local",
    localBackupOf: item.id || null,
    backupCreatedAt: timestamp,
    date: timestamp,
    savedAt: timestamp,
    updatedAt: timestamp
  });
}

function buildConflictRows(localItems, dbItems) {
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
    const duplicateLocal = row.local.length > 1;
    const dbNewer = hasLocal && hasDb && restored && dateMs(db?.updated_at || db?.updatedAt) > dateMs(local?.originUpdatedAt || local?.restoredAt || local?.updatedAt);
    const localEdited = restored && dateMs(local?.updatedAt) > dateMs(local?.restoredAt) + 1000;
    const updatePossible = hasDb && (restored || hasLocal || !hasLocal);
    const title = db?.title || db?.name || scenarioTitle(local);
    let status = "Nur lokal";
    let tone = "warn";
    if (hasLocal && hasDb && restored) { status = dbNewer ? "DB neuer · Aktualisierung möglich" : "DB-Restore vorhanden"; tone = dbNewer ? "warn" : "ok"; }
    else if (hasLocal && hasDb) { status = "Lokal und DB vorhanden"; tone = "info"; }
    else if (!hasLocal && hasDb) { status = "Nur DB"; tone = "info"; }
    if (localEdited) { status += " · lokale Bearbeitung möglich"; tone = "warn"; }
    if (duplicateLocal) { status += " · lokale Doppelung"; tone = "warn"; }
    return { ...row, title, hasLocal, hasDb, restored, duplicateLocal, dbNewer, localEdited, updatePossible, status, tone };
  }).sort((a, b) => a.title.localeCompare(b.title, "de"));
}

export default function App24() {
  useMemo(() => repairLocalScenarioDates(), []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState(null);
  const [dbScenarios, setDbScenarios] = useState([]);
  const [localScenarios, setLocalScenarios] = useState(() => readLocalScenarios());
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [lastAction, setLastAction] = useState("");

  const conflictRows = useMemo(() => buildConflictRows(localScenarios, dbScenarios), [localScenarios, dbScenarios]);
  const conflictSummary = useMemo(() => ({
    local: localScenarios.length,
    db: dbScenarios.length,
    restored: conflictRows.filter((x) => x.restored).length,
    onlyLocal: conflictRows.filter((x) => x.hasLocal && !x.hasDb).length,
    onlyDb: conflictRows.filter((x) => !x.hasLocal && x.hasDb).length,
    both: conflictRows.filter((x) => x.hasLocal && x.hasDb).length,
    duplicates: conflictRows.filter((x) => x.duplicateLocal).length,
    dbNewer: conflictRows.filter((x) => x.dbNewer).length,
    localEdited: conflictRows.filter((x) => x.localEdited).length
  }), [conflictRows, localScenarios.length, dbScenarios.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dbScenarios;
    return dbScenarios.filter((s) => JSON.stringify(s).toLowerCase().includes(q));
  }, [dbScenarios, query]);

  function refreshLocal() {
    repairLocalScenarioDates();
    setLocalScenarios(readLocalScenarios());
    setLastAction("Lokaler Speicher wurde neu gelesen und Datumsfelder wurden geprüft.");
  }

  async function loadDbScenarios() {
    setOpen(true);
    setLoading(true);
    setError("");
    setLastAction("");
    try {
      repairLocalScenarioDates();
      const [h, scenarios] = await Promise.all([
        getJson("/api/health"),
        getJson("/api/db/scenarios")
      ]);
      setHealth(h);
      setDbScenarios(scenarios.items || []);
      setLocalScenarios(readLocalScenarios());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id) {
    setLoading(true);
    setError("");
    setLastAction("");
    try {
      const detail = await getJson(`/api/db/scenarios/${encodeURIComponent(id)}`);
      setSelected(detail);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function updateLocalFromDb(scenarioId, { createBackup = true } = {}) {
    setLoading(true);
    setError("");
    setLastAction("");
    try {
      const detail = await getJson(`/api/db/scenarios/${encodeURIComponent(scenarioId)}`);
      const pack = detail.localStoragePackage;
      if (!pack) throw new Error("Kein Restore-Paket vorhanden.");
      const existing = readLocalScenarios();
      const previous = existing.find((x) => x.id === pack.id || normalizeTitle(scenarioTitle(x)) === normalizeTitle(detail.scenario?.title || pack.name));
      const message = previous
        ? "Lokale Kopie aus der Datenbank aktualisieren? Die aktuelle lokale Kopie wird ersetzt. Optional wird vorher eine Sicherung angelegt."
        : "Dieses DB-Szenario neu in den lokalen Browser-Speicher übernehmen?";
      if (!window.confirm(message)) return;
      const withBackup = previous && createBackup && window.confirm("Vor dem Überschreiben eine lokale Sicherungskopie anlegen?");
      const restored = makeRestoredScenario(pack, detail, previous);
      const filtered = existing.filter((x) => x.id !== restored.id && normalizeTitle(scenarioTitle(x)) !== normalizeTitle(detail.scenario?.title || restored.name));
      const next = [restored, ...(withBackup ? [makeLocalBackup(previous)] : []), ...filtered];
      writeLocalScenarios(next);
      setLocalScenarios(next);
      setSelected(detail);
      setLastAction(previous ? "Lokale DB-Restore-Kopie wurde kontrolliert aus der Datenbank aktualisiert." : "DB-Szenario wurde neu lokal übernommen.");
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function restoreSelected() {
    const pack = selected?.localStoragePackage;
    if (!pack) {
      setError("Kein Restore-Paket vorhanden.");
      return;
    }
    updateLocalFromDb(pack.id || selected?.scenario?.id);
  }

  return (
    <>
      <App23 />
      <button
        onClick={() => open ? setOpen(false) : loadDbScenarios()}
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 130,
          background: "#020617",
          color: "white",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: 999,
          padding: "13px 18px",
          fontSize: 14,
          fontWeight: 950,
          boxShadow: "0 14px 40px rgba(15,23,42,.35)",
          cursor: "pointer"
        }}
        title="Hybrid-Lesemodus: DB-Szenarien anzeigen, Herkunft und Konflikte prüfen"
      >
        DB-Lesemodus 2.8
      </button>

      {open && (
        <div style={{
          position: "fixed",
          right: 18,
          bottom: 78,
          width: "min(900px, calc(100vw - 36px))",
          maxHeight: "min(840px, calc(100vh - 110px))",
          overflow: "auto",
          zIndex: 129,
          background: "#ffffff",
          color: "#0f172a",
          border: "1px solid #dbe3ee",
          borderRadius: 24,
          boxShadow: "0 24px 80px rgba(15,23,42,.32)",
          padding: 18,
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em" }}>App 2.8 · kontrollierte Aktualisierung</div>
              <h2 style={{ margin: "4px 0 4px", fontSize: 22 }}>DB-Szenarien lesen</h2>
              <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>Lokale DB-Restore-Kopien können gezielt aus der Datenbank aktualisiert werden. Es wird nichts automatisch überschrieben.</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: "white", padding: "8px 10px", cursor: "pointer", fontWeight: 900 }}>Schließen</button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button onClick={loadDbScenarios} style={{ border: "1px solid #020617", borderRadius: 14, background: "#020617", color: "white", padding: "10px 12px", cursor: "pointer", fontWeight: 900 }}>DB-Liste aktualisieren</button>
            <button onClick={refreshLocal} style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "white", color: "#0f172a", padding: "10px 12px", cursor: "pointer", fontWeight: 900 }}>Lokalen Speicher prüfen</button>
            <a href="/db-viewer.html" target="_blank" rel="noreferrer" style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "white", color: "#0f172a", padding: "10px 12px", textDecoration: "none", fontWeight: 900 }}>DB-Viewer öffnen</a>
            {health && <Pill tone={health.storageMode === "local" ? "ok" : "warn"}>storageMode: {health.storageMode}</Pill>}
            {health && <Pill tone={health.databaseConfigured ? "ok" : "bad"}>DB konfiguriert: {String(health.databaseConfigured)}</Pill>}
          </div>

          <div style={{ marginTop: 14, border: "1px solid #e2e8f0", borderRadius: 18, background: "#f8fafc", padding: 12 }}>
            <div style={{ fontWeight: 950, marginBottom: 8 }}>Herkunft und Konflikte</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Pill tone="info">lokal: {conflictSummary.local}</Pill>
              <Pill tone="info">Datenbank: {conflictSummary.db}</Pill>
              <Pill tone="ok">DB-Restore: {conflictSummary.restored}</Pill>
              <Pill tone={conflictSummary.onlyLocal ? "warn" : "ok"}>nur lokal: {conflictSummary.onlyLocal}</Pill>
              <Pill tone={conflictSummary.onlyDb ? "info" : "ok"}>nur DB: {conflictSummary.onlyDb}</Pill>
              <Pill tone={conflictSummary.dbNewer ? "warn" : "ok"}>DB neuer: {conflictSummary.dbNewer}</Pill>
              <Pill tone={conflictSummary.localEdited ? "warn" : "ok"}>lokal bearbeitet: {conflictSummary.localEdited}</Pill>
              <Pill tone={conflictSummary.duplicates ? "warn" : "ok"}>lokale Doppelungen: {conflictSummary.duplicates}</Pill>
            </div>
          </div>

          {loading && <p style={{ color: "#64748b" }}>Lade...</p>}
          {error && <div style={{ marginTop: 12, border: "1px solid #fecdd3", background: "#fff1f2", color: "#9f1239", borderRadius: 16, padding: 12, fontWeight: 800 }}>{error}</div>}
          {lastAction && <div style={{ marginTop: 12, border: "1px solid #bbf7d0", background: "#ecfdf5", color: "#065f46", borderRadius: 16, padding: 12, fontWeight: 800 }}>{lastAction}</div>}

          {conflictRows.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 950, marginBottom: 8 }}>Konfliktliste</div>
              <div style={{ display: "grid", gap: 8 }}>
                {conflictRows.slice(0, 10).map((row) => (
                  <div key={row.key} style={{ border: "1px solid #e2e8f0", borderRadius: 16, background: "white", padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{row.title}</div>
                        <div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>
                          lokal: {row.local.map((x) => `${scenarioTitle(x)} (${localOrigin(x)})`).join(", ") || "—"} · DB: {row.db.map((x) => x.title).join(", ") || "—"}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          <Pill tone={row.tone}>{row.status}</Pill>
                          {row.localEdited && <Pill tone="warn">lokale Bearbeitung schützen</Pill>}
                          {row.dbNewer && <Pill tone="warn">DB-Version neuer</Pill>}
                        </div>
                      </div>
                      {row.hasDb && (
                        <button onClick={() => updateLocalFromDb(row.db[0].id)} style={{ border: "1px solid #020617", borderRadius: 14, background: "#020617", color: "white", padding: "9px 11px", cursor: "pointer", fontWeight: 900, whiteSpace: "nowrap" }}>
                          {row.hasLocal ? "Aus DB aktualisieren" : "Aus DB übernehmen"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="DB-Szenarien filtern..."
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 14, padding: "11px 12px", fontSize: 15 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10, marginTop: 14 }}>
            {filtered.map((s) => {
              const localMatch = localScenarios.find((x) => x.id === s.id || normalizeTitle(scenarioTitle(x)) === normalizeTitle(s.title));
              return (
                <div key={s.id} style={{ border: "1px solid #e2e8f0", borderRadius: 18, padding: 14, background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 950 }}>{s.title}</div>
                      <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{s.description || s.name || s.id}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        <Pill tone={s.project_count === 0 ? "warn" : "info"}>Projekte: {s.project_count}</Pill>
                        <Pill>Versionen: {s.version_count}</Pill>
                        <Pill>Datenbank</Pill>
                        {localMatch ? <Pill tone={localOrigin(localMatch) === "DB-Restore" ? "ok" : "warn"}>lokal: {localOrigin(localMatch)}</Pill> : <Pill tone="info">nur DB</Pill>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button onClick={() => loadDetail(s.id)} style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "white", padding: "9px 11px", cursor: "pointer", fontWeight: 900, whiteSpace: "nowrap" }}>Details</button>
                      <button onClick={() => updateLocalFromDb(s.id)} style={{ border: "1px solid #020617", borderRadius: 14, background: "#020617", color: "white", padding: "9px 11px", cursor: "pointer", fontWeight: 900, whiteSpace: "nowrap" }}>{localMatch ? "Aktualisieren" : "Übernehmen"}</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && filtered.length === 0 && <p style={{ color: "#64748b" }}>Keine DB-Szenarien gefunden.</p>}
          </div>

          {selected && (
            <div style={{ marginTop: 16, border: "1px solid #dbe3ee", borderRadius: 20, padding: 16, background: "#ffffff" }}>
              <h3 style={{ margin: "0 0 8px" }}>{selected.scenario?.title}</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {(selected.projects || []).length ? selected.projects.map((p) => <Pill key={p.id} tone="info">{p.title} · {p.relation_type || "contains"}</Pill>) : <Pill tone="warn">nicht zugeordnet</Pill>}
                <Pill tone={selected.localStoragePackage ? "ok" : "bad"}>Restore-Paket: {selected.localStoragePackage ? "ja" : "nein"}</Pill>
                {localScenarios.some((x) => x.id === selected.scenario?.id) ? <Pill tone="warn">lokale Kopie mit gleicher ID</Pill> : <Pill tone="info">keine gleiche lokale ID</Pill>}
              </div>
              <p style={{ color: "#475569", fontSize: 14 }}>Dieses Szenario kann als lokale Kopie in die Haupt-App übernommen oder eine vorhandene DB-Restore-Kopie kontrolliert aktualisiert werden. Die Datenbank bleibt davon unberührt.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={restoreSelected} disabled={!selected.localStoragePackage} style={{ border: "1px solid #020617", borderRadius: 14, background: selected.localStoragePackage ? "#020617" : "#cbd5e1", color: "white", padding: "10px 12px", cursor: selected.localStoragePackage ? "pointer" : "not-allowed", fontWeight: 900 }}>Kontrolliert aktualisieren/übernehmen</button>
                <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(normalizeScenarioDates(selected.localStoragePackage || selected), null, 2))} style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "white", padding: "10px 12px", cursor: "pointer", fontWeight: 900 }}>Paket kopieren</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
