import React, { useMemo, useState } from "react";
import App23 from "./App23.jsx";

const LOCAL_SCENARIOS_KEY = "ki-kernel-szenarien-v8";

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
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalScenarios(items) {
  localStorage.setItem(LOCAL_SCENARIOS_KEY, JSON.stringify(items));
}

export default function App24() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState(null);
  const [dbScenarios, setDbScenarios] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [lastAction, setLastAction] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dbScenarios;
    return dbScenarios.filter((s) => JSON.stringify(s).toLowerCase().includes(q));
  }, [dbScenarios, query]);

  async function loadDbScenarios() {
    setOpen(true);
    setLoading(true);
    setError("");
    setLastAction("");
    try {
      const [h, scenarios] = await Promise.all([
        getJson("/api/health"),
        getJson("/api/db/scenarios")
      ]);
      setHealth(h);
      setDbScenarios(scenarios.items || []);
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

  function restoreSelected() {
    const pack = selected?.localStoragePackage;
    if (!pack) {
      setError("Kein Restore-Paket vorhanden.");
      return;
    }
    const ok = window.confirm("Dieses DB-Szenario in den lokalen Browser-Speicher übernehmen? Bestehende lokale Daten werden nicht automatisch synchronisiert.");
    if (!ok) return;
    const existing = readLocalScenarios();
    const restored = {
      ...pack,
      id: pack.id || `db_${Date.now()}`,
      name: `${pack.name || selected?.scenario?.title || "DB-Szenario"} · DB-Restore`,
      source: "database",
      restoredAt: new Date().toISOString()
    };
    const next = [restored, ...existing.filter((x) => x.id !== restored.id)];
    writeLocalScenarios(next);
    setLastAction("Szenario wurde lokal übernommen. Lade die Haupt-App hart neu, falls es nicht sofort in den gespeicherten Szenarien erscheint.");
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
        title="Hybrid-Lesemodus: DB-Szenarien anzeigen, ohne LocalStorage zu ersetzen"
      >
        DB-Lesemodus 2.6
      </button>

      {open && (
        <div style={{
          position: "fixed",
          right: 18,
          bottom: 78,
          width: "min(780px, calc(100vw - 36px))",
          maxHeight: "min(760px, calc(100vh - 110px))",
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
              <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em" }}>App 2.6 · Hybrid-Lesemodus</div>
              <h2 style={{ margin: "4px 0 4px", fontSize: 22 }}>DB-Szenarien lesen</h2>
              <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>Die Haupt-App bleibt lokal. Datenbank-Szenarien werden nur angezeigt und bei Bedarf gezielt in den Browser-Speicher übernommen.</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: "white", padding: "8px 10px", cursor: "pointer", fontWeight: 900 }}>Schließen</button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button onClick={loadDbScenarios} style={{ border: "1px solid #020617", borderRadius: 14, background: "#020617", color: "white", padding: "10px 12px", cursor: "pointer", fontWeight: 900 }}>DB-Liste aktualisieren</button>
            <a href="/db-viewer.html" target="_blank" rel="noreferrer" style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "white", color: "#0f172a", padding: "10px 12px", textDecoration: "none", fontWeight: 900 }}>DB-Viewer öffnen</a>
            {health && <Pill tone={health.storageMode === "local" ? "ok" : "warn"}>storageMode: {health.storageMode}</Pill>}
            {health && <Pill tone={health.databaseConfigured ? "ok" : "bad"}>DB konfiguriert: {String(health.databaseConfigured)}</Pill>}
          </div>

          {loading && <p style={{ color: "#64748b" }}>Lade...</p>}
          {error && <div style={{ marginTop: 12, border: "1px solid #fecdd3", background: "#fff1f2", color: "#9f1239", borderRadius: 16, padding: 12, fontWeight: 800 }}>{error}</div>}
          {lastAction && <div style={{ marginTop: 12, border: "1px solid #bbf7d0", background: "#ecfdf5", color: "#065f46", borderRadius: 16, padding: 12, fontWeight: 800 }}>{lastAction}</div>}

          <div style={{ marginTop: 14 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="DB-Szenarien filtern..."
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 14, padding: "11px 12px", fontSize: 15 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10, marginTop: 14 }}>
            {filtered.map((s) => (
              <div key={s.id} style={{ border: "1px solid #e2e8f0", borderRadius: 18, padding: 14, background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 950 }}>{s.title}</div>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{s.description || s.name || s.id}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      <Pill tone={s.project_count === 0 ? "warn" : "info"}>Projekte: {s.project_count}</Pill>
                      <Pill>Versionen: {s.version_count}</Pill>
                      <Pill>Datenbank</Pill>
                    </div>
                  </div>
                  <button onClick={() => loadDetail(s.id)} style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "white", padding: "9px 11px", cursor: "pointer", fontWeight: 900, whiteSpace: "nowrap" }}>Details</button>
                </div>
              </div>
            ))}
            {!loading && filtered.length === 0 && <p style={{ color: "#64748b" }}>Keine DB-Szenarien gefunden.</p>}
          </div>

          {selected && (
            <div style={{ marginTop: 16, border: "1px solid #dbe3ee", borderRadius: 20, padding: 16, background: "#ffffff" }}>
              <h3 style={{ margin: "0 0 8px" }}>{selected.scenario?.title}</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {(selected.projects || []).length ? selected.projects.map((p) => <Pill key={p.id} tone="info">{p.title} · {p.relation_type || "contains"}</Pill>) : <Pill tone="warn">nicht zugeordnet</Pill>}
                <Pill tone={selected.localStoragePackage ? "ok" : "bad"}>Restore-Paket: {selected.localStoragePackage ? "ja" : "nein"}</Pill>
              </div>
              <p style={{ color: "#475569", fontSize: 14 }}>Dieses Szenario kann als lokale Kopie in die Haupt-App übernommen werden. Die Datenbank bleibt davon unberührt.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={restoreSelected} disabled={!selected.localStoragePackage} style={{ border: "1px solid #020617", borderRadius: 14, background: selected.localStoragePackage ? "#020617" : "#cbd5e1", color: "white", padding: "10px 12px", cursor: selected.localStoragePackage ? "pointer" : "not-allowed", fontWeight: 900 }}>In lokale App übernehmen</button>
                <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(selected.localStoragePackage || selected, null, 2))} style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "white", padding: "10px 12px", cursor: "pointer", fontWeight: 900 }}>Paket kopieren</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
