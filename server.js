import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import multer from "multer";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || "";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "";
const MAX_REQUEST_BYTES = process.env.MAX_REQUEST_BYTES || "2mb";
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 8 * 1024 * 1024);
const DATABASE_URL = process.env.DATABASE_URL || "";
const STORAGE_MODE = process.env.STORAGE_MODE || "local";

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

app.disable("x-powered-by");
app.use(express.json({ limit: MAX_REQUEST_BYTES }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

function basicAuth(req, res, next) {
  if (!BASIC_AUTH_USER || !BASIC_AUTH_PASSWORD) return next();
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) {
    res.setHeader("WWW-Authenticate", 'Basic realm="KI-Kernel GPT"');
    return res.status(401).send("Authentication required");
  }
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const idx = decoded.indexOf(":");
  if (decoded.slice(0, idx) !== BASIC_AUTH_USER || decoded.slice(idx + 1) !== BASIC_AUTH_PASSWORD) {
    res.setHeader("WWW-Authenticate", 'Basic realm="KI-Kernel GPT"');
    return res.status(401).send("Authentication required");
  }
  next();
}
app.use(basicAuth);

function maskDatabaseUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}`;
  } catch {
    return "configured-but-not-parseable";
  }
}

async function createPool() {
  if (!DATABASE_URL) return null;
  const mod = await import("pg");
  const Pool = mod.default?.Pool || mod.Pool;
  return new Pool({ connectionString: DATABASE_URL });
}

async function withDb(fn) {
  const pool = await createPool();
  if (!pool) throw new Error("DATABASE_URL ist nicht gesetzt.");
  try { return await fn(pool); } finally { await pool.end().catch(() => {}); }
}

async function dbStatus() {
  return await withDb(async (pool) => {
    const ping = await pool.query("select 1 as ok");
    const tables = await pool.query(`select table_name from information_schema.tables where table_schema='public' and table_name in ('users','projects','scenarios','project_scenarios','scenario_versions','phase_sets','consulting_cases','audit_log') order by table_name`);
    const names = tables.rows.map((r) => r.table_name);
    const required = ["users", "projects", "scenarios", "project_scenarios", "scenario_versions", "phase_sets", "consulting_cases", "audit_log"];
    const missing = required.filter((x) => !names.includes(x));
    return { configured: true, reachable: ping.rows?.[0]?.ok === 1, tablesReady: missing.length === 0, existingTables: names, missingTables: missing, note: missing.length ? "Datenbank erreichbar, aber Tabellen fehlen." : "Datenbank erreichbar und Basistabellen vorhanden." };
  }).catch((error) => ({ configured: Boolean(DATABASE_URL), reachable: false, tablesReady: false, note: String(error?.message || error).slice(0, 800) }));
}

async function ensureSchema() {
  return await withDb(async (pool) => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(`
        create table if not exists users (id text primary key, email text unique, display_name text, role text not null default 'owner', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
        create table if not exists projects (id text primary key, user_id text not null references users(id) on delete cascade, title text not null, description text, status text not null default 'Vorbereitung', priority text not null default 'mittel', tags jsonb, decision_need text, next_step text, boundaries text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz);
        create table if not exists scenarios (id text primary key, user_id text not null references users(id) on delete cascade, title text not null, name text, description text, current_version_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz);
        create table if not exists project_scenarios (id text primary key, project_id text not null references projects(id) on delete cascade, scenario_id text not null references scenarios(id) on delete cascade, relation_type text not null default 'contains', sort_order integer not null default 0, created_at timestamptz not null default now(), unique(project_id, scenario_id));
        create table if not exists scenario_versions (id text primary key, scenario_id text not null references scenarios(id) on delete cascade, version_number integer not null, source text, state_json jsonb not null, note text, created_by text, created_at timestamptz not null default now(), unique(scenario_id, version_number));
        create table if not exists phase_sets (id text primary key, user_id text not null references users(id) on delete cascade, name text not null, phases jsonb not null, is_builtin boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
        create table if not exists scenario_phases (id text primary key, scenario_id text not null references scenarios(id) on delete cascade, scenario_version_id text, phase_set_id text, phases_json jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
        create table if not exists scenario_relations (id text primary key, scenario_id text not null references scenarios(id) on delete cascade, scenario_version_id text, relations_json jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
        create table if not exists consulting_cases (id text primary key, user_id text not null references users(id) on delete cascade, project_id text references projects(id) on delete set null, scenario_id text references scenarios(id) on delete set null, title text not null, status text not null default 'Vorbereitung', priority text not null default 'mittel', mandate text, decision_need text, deliverable text, boundaries text, consulting_notes text, reflection text, todos jsonb, journal jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
        create table if not exists reports (id text primary key, user_id text not null references users(id) on delete cascade, project_id text references projects(id) on delete set null, scenario_id text references scenarios(id) on delete set null, report_type text not null, title text not null, content text, content_json jsonb, created_at timestamptz not null default now());
        create table if not exists imports (id text primary key, user_id text not null references users(id) on delete cascade, project_id text references projects(id) on delete set null, filename text, document_type text, analysis_mode text, extracted_text text, draft_json jsonb, created_at timestamptz not null default now());
        create table if not exists audit_log (id text primary key, user_id text references users(id) on delete set null, entity_type text not null, entity_id text, action text not null, metadata jsonb, created_at timestamptz not null default now());`);
      await client.query("commit");
      return await dbStatus();
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally { client.release(); }
  });
}

function normalizeBackup(raw) {
  if (raw?.schema === "ki-kernel-local-backup") return raw.data || {};
  if (raw?.data && (raw.data.projects || raw.data.scenarios || raw.data.phaseSets)) return raw.data;
  return raw || {};
}
function analyzeBackup(raw) {
  const data = normalizeBackup(raw);
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
  const phaseSets = Array.isArray(data.phaseSets) ? data.phaseSets : [];
  const consultingCases = Array.isArray(data.consultingCases) ? data.consultingCases : [];
  const importDrafts = Array.isArray(data.importDrafts) ? data.importDrafts : [];
  const missingScenarioRefs = projects.flatMap((project) => (Array.isArray(project.scenarioIds) ? project.scenarioIds : []).filter((scenarioId) => !scenarios.some((scenario) => scenario.id === scenarioId)).map((scenarioId) => ({ projectId: project.id, projectTitle: project.title, scenarioId })));
  return { ok: true, counts: { projects: projects.length, scenarios: scenarios.length, phaseSets: phaseSets.length, consultingCases: consultingCases.length, importDrafts: importDrafts.length }, missingScenarioRefs, warnings: missingScenarioRefs.length ? ["Einige Projekt-Szenario-Verweise zeigen auf nicht vorhandene Szenarien."] : [] };
}
function uid(prefix = "id") { return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`; }

async function importBackup(raw, options = {}) {
  if (options.confirmation !== "IMPORT IN DATENBANK") throw new Error("Bestätigungsphrase fehlt. Erforderlich: IMPORT IN DATENBANK");
  const data = normalizeBackup(raw), analysis = analyzeBackup(raw);
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
  const phaseSets = Array.isArray(data.phaseSets) ? data.phaseSets : [];
  const consultingCases = Array.isArray(data.consultingCases) ? data.consultingCases : [];
  return await withDb(async (pool) => {
    const client = await pool.connect();
    const userId = "local_owner";
    const imported = { users: 0, projects: 0, scenarios: 0, projectScenarios: 0, scenarioVersions: 0, phaseSets: 0, consultingCases: 0, auditLog: 0 };
    try {
      await client.query("begin");
      await client.query("insert into users(id,email,display_name,role) values($1,$2,$3,$4) on conflict(id) do update set updated_at=now()", [userId, null, "Local Owner", "owner"]); imported.users = 1;
      for (const s of scenarios) {
        const id = s.id || uid("scenario");
        const title = s.state?.context?.title || s.name || "Szenario";
        await client.query("insert into scenarios(id,user_id,title,name,description,created_at,updated_at) values($1,$2,$3,$4,$5,now(),now()) on conflict(id) do update set title=excluded.title,name=excluded.name,description=excluded.description,updated_at=now()", [id, userId, title, s.name || title, s.state?.context?.decisionQuestion || null]);
        const versionId = `version_${id}_1`;
        await client.query("insert into scenario_versions(id,scenario_id,version_number,source,state_json,note,created_by) values($1,$2,1,$3,$4,$5,$6) on conflict(scenario_id,version_number) do update set state_json=excluded.state_json,note=excluded.note", [versionId, id, "localStorage-import", JSON.stringify(s.state || {}), "Import aus LocalStorage-Backup", userId]);
        await client.query("update scenarios set current_version_id=$1 where id=$2", [versionId, id]);
        imported.scenarios++; imported.scenarioVersions++;
      }
      for (const p of projects) {
        const id = p.id || uid("project");
        await client.query("insert into projects(id,user_id,title,description,status,priority,tags,decision_need,next_step,boundaries,notes,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now()) on conflict(id) do update set title=excluded.title,description=excluded.description,status=excluded.status,priority=excluded.priority,tags=excluded.tags,decision_need=excluded.decision_need,next_step=excluded.next_step,boundaries=excluded.boundaries,notes=excluded.notes,updated_at=now()", [id, userId, p.title || "Projekt", p.description || null, p.status || "Vorbereitung", p.priority || "mittel", JSON.stringify(p.tags || []), p.decisionNeed || null, p.nextStep || null, p.boundaries || null, p.notes || null]);
        imported.projects++;
        let order = 0;
        for (const scenarioId of Array.isArray(p.scenarioIds) ? p.scenarioIds : []) if (scenarios.some((s) => s.id === scenarioId)) { await client.query("insert into project_scenarios(id,project_id,scenario_id,relation_type,sort_order) values($1,$2,$3,'contains',$4) on conflict(project_id,scenario_id) do update set sort_order=excluded.sort_order", [`ps_${id}_${scenarioId}`, id, scenarioId, order++]); imported.projectScenarios++; }
      }
      for (const set of phaseSets) { const id = set.id || uid("phase_set"); await client.query("insert into phase_sets(id,user_id,name,phases,is_builtin,created_at,updated_at) values($1,$2,$3,$4,false,now(),now()) on conflict(id) do update set name=excluded.name,phases=excluded.phases,updated_at=now()", [id, userId, set.name || "Phasen-Set", JSON.stringify(set.phases || [])]); imported.phaseSets++; }
      for (const c of consultingCases) { const id = c.id || uid("case"); await client.query("insert into consulting_cases(id,user_id,title,status,priority,mandate,decision_need,deliverable,boundaries,consulting_notes,reflection,todos,journal,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now(),now()) on conflict(id) do update set title=excluded.title,status=excluded.status,priority=excluded.priority,mandate=excluded.mandate,decision_need=excluded.decision_need,deliverable=excluded.deliverable,boundaries=excluded.boundaries,consulting_notes=excluded.consulting_notes,reflection=excluded.reflection,todos=excluded.todos,journal=excluded.journal,updated_at=now()", [id, userId, c.title || "Beratungsfall", c.status || "Vorbereitung", c.priority || "mittel", c.mandate || null, c.decisionNeed || null, c.deliverable || null, c.boundaries || null, c.consultingNotes || c.notes || null, c.reflection || null, JSON.stringify(c.todos || []), JSON.stringify(c.journal || [])]); imported.consultingCases++; }
      await client.query("insert into audit_log(id,user_id,entity_type,entity_id,action,metadata) values($1,$2,'backup',null,'import_local_backup',$3)", [uid("audit"), userId, JSON.stringify({ imported, analysis })]); imported.auditLog = 1;
      await client.query("commit"); return { imported, analysis };
    } catch (error) { await client.query("rollback").catch(() => {}); throw error; } finally { client.release(); }
  });
}

async function dbCounts() {
  return await withDb(async (pool) => {
    const tables = ["users", "projects", "scenarios", "project_scenarios", "scenario_versions", "phase_sets", "consulting_cases", "reports", "imports", "audit_log"];
    const out = {};
    for (const table of tables) {
      try { out[table] = Number((await pool.query(`select count(*)::int as count from ${table}`)).rows[0].count); }
      catch { out[table] = null; }
    }
    const lastImport = await pool.query("select id, action, metadata, created_at from audit_log where action='import_local_backup' order by created_at desc limit 1").catch(() => ({ rows: [] }));
    return { counts: out, lastImport: lastImport.rows[0] || null };
  });
}
async function dbAuditLog(limit = 20) { return await withDb(async (pool) => (await pool.query("select id, entity_type, entity_id, action, metadata, created_at from audit_log order by created_at desc limit $1", [Math.min(Math.max(Number(limit) || 20, 1), 100)])).rows); }
async function dbProjects() { return await withDb(async (pool) => (await pool.query("select p.id, p.title, p.status, p.priority, p.tags, p.decision_need, p.next_step, p.created_at, p.updated_at, count(ps.scenario_id)::int as scenario_count from projects p left join project_scenarios ps on ps.project_id=p.id group by p.id order by p.updated_at desc")).rows); }
async function dbScenarios() { return await withDb(async (pool) => (await pool.query("select s.id, s.title, s.name, s.description, s.current_version_id, s.created_at, s.updated_at, count(ps.project_id)::int as project_count, count(sv.id)::int as version_count from scenarios s left join project_scenarios ps on ps.scenario_id=s.id left join scenario_versions sv on sv.scenario_id=s.id group by s.id order by s.updated_at desc")).rows); }

async function checkDatabase() { if (STORAGE_MODE === "local") return { reachable: null, active: false, note: "Datenbankprüfung übersprungen, weil STORAGE_MODE=local. Die App nutzt weiterhin Browser-LocalStorage als Hauptspeicher." }; const s = await dbStatus(); return { reachable: s.reachable, active: true, note: s.note, tablesReady: s.tablesReady, missingTables: s.missingTables || [] }; }

app.get("/api/health", async (_req, res) => { const db = await checkDatabase(); res.json({ ok: true, appVersion: "2.1-db-inspection", model: OPENAI_MODEL, openaiConfigured: Boolean(OPENAI_API_KEY), databaseConfigured: Boolean(DATABASE_URL), databaseActive: db.active, databaseReachable: db.reachable, databaseReachableNote: db.note, databaseTablesReady: db.tablesReady ?? null, databaseMissingTables: db.missingTables ?? [], databaseUrlPreview: maskDatabaseUrl(DATABASE_URL), storageMode: STORAGE_MODE, allowedStorageModes: ["local", "hybrid", "db"], maxRequestBytes: MAX_REQUEST_BYTES, maxUploadBytes: MAX_UPLOAD_BYTES, basicAuthEnabled: Boolean(BASIC_AUTH_USER && BASIC_AUTH_PASSWORD) }); });
app.get("/api/db/status", async (_req, res) => { try { res.json({ ok: true, storageMode: STORAGE_MODE, ...(await dbStatus()) }); } catch (e) { res.status(500).json({ ok: false, error: String(e?.message || e) }); } });
app.get("/api/db/counts", async (_req, res) => { try { res.json({ ok: true, ...(await dbCounts()) }); } catch (e) { res.status(500).json({ ok: false, error: String(e?.message || e) }); } });
app.get("/api/db/audit-log", async (req, res) => { try { res.json({ ok: true, items: await dbAuditLog(req.query.limit) }); } catch (e) { res.status(500).json({ ok: false, error: String(e?.message || e) }); } });
app.get("/api/db/projects", async (_req, res) => { try { res.json({ ok: true, items: await dbProjects() }); } catch (e) { res.status(500).json({ ok: false, error: String(e?.message || e) }); } });
app.get("/api/db/scenarios", async (_req, res) => { try { res.json({ ok: true, items: await dbScenarios() }); } catch (e) { res.status(500).json({ ok: false, error: String(e?.message || e) }); } });
app.post("/api/db/ensure-schema", async (req, res) => { try { if (req.body?.confirmation !== "SCHEMA ANLEGEN") return res.status(400).json({ ok: false, error: "Bestätigungsphrase fehlt. Erforderlich: SCHEMA ANLEGEN" }); res.json({ ok: true, status: await ensureSchema() }); } catch (e) { res.status(500).json({ ok: false, error: String(e?.message || e) }); } });
app.post("/api/db/import-backup/dry-run", async (req, res) => { try { res.json({ ok: true, dryRun: true, analysis: analyzeBackup(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: String(e?.message || e) }); } });
app.post("/api/db/import-backup", async (req, res) => { try { const { backup, confirmation } = req.body || {}; if (!backup) return res.status(400).json({ ok: false, error: "backup fehlt." }); res.json({ ok: true, result: await importBackup(backup, { confirmation }) }); } catch (e) { res.status(500).json({ ok: false, error: String(e?.message || e) }); } });

function fileExtension(name = "") { return name.toLowerCase().split(".").pop() || ""; }
app.post("/api/extract-document", upload.single("file"), async (req, res) => { try { const file = req.file; if (!file) return res.status(400).json({ error: "Keine Datei übermittelt." }); const ext = fileExtension(file.originalname); let text = ""; if (["txt", "md", "json"].includes(ext) || file.mimetype?.startsWith("text/")) text = file.buffer.toString("utf8"); else if (ext === "docx" || file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") text = (await mammoth.extractRawText({ buffer: file.buffer })).value || ""; else if (ext === "pdf" || file.mimetype === "application/pdf") text = (await pdfParse(file.buffer)).text || ""; else return res.status(400).json({ error: "Dateityp nicht unterstützt. Unterstützt: TXT, MD, JSON, DOCX, PDF." }); const clean = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim(); if (!clean) return res.status(422).json({ error: "Es konnte kein Text extrahiert werden. Bei gescannten PDFs ist OCR nötig; das ist noch nicht aktiviert." }); res.json({ filename: file.originalname, mimeType: file.mimetype, bytes: file.size, characters: clean.length, text: clean.slice(0, 120000), truncated: clean.length > 120000 }); } catch (e) { res.status(500).json({ error: "Dokumentextraktion fehlgeschlagen", details: process.env.NODE_ENV === "production" ? undefined : String(e) }); } });

const reportSchema = { type: "object", additionalProperties: false, properties: { "Executive Summary": { type: "string" }, "Ausgangslage": { type: "string" }, "Simulationsannahmen": { type: "string" }, "Persona- und Stakeholderanalyse": { type: "string" }, "Ressourcen- und Risikolage": { type: "string" }, "Phasenanalyse": { type: "string" }, "Konflikt- und Koalitionsmuster": { type: "string" }, "Kritische Kipppunkte": { type: "string" }, "Interventionsoptionen": { type: "string" }, "Entscheidungsmatrix": { type: "string" }, "Maßnahmenplan": { type: "string" }, "Offene Fragen": { type: "string" }, "Datenschutz-/Governance-Hinweise": { type: "string" }, "Grenzen der Simulation": { type: "string" } }, required: ["Executive Summary", "Ausgangslage", "Simulationsannahmen", "Persona- und Stakeholderanalyse", "Ressourcen- und Risikolage", "Phasenanalyse", "Konflikt- und Koalitionsmuster", "Kritische Kipppunkte", "Interventionsoptionen", "Entscheidungsmatrix", "Maßnahmenplan", "Offene Fragen", "Datenschutz-/Governance-Hinweise", "Grenzen der Simulation"] };
const scenarioSchema = { type: "object", additionalProperties: false, properties: { context: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, domain: { type: "string" }, decisionQuestion: { type: "string" }, goal: { type: "string" }, boundaries: { type: "string" } }, required: ["title", "domain", "decisionQuestion", "goal", "boundaries"] }, assumptions: { type: "array", items: { type: "object", additionalProperties: true } }, personas: { type: "array", items: { type: "object", additionalProperties: true } }, resources: { type: "array", items: { type: "object", additionalProperties: true } }, interventions: { type: "array", items: { type: "object", additionalProperties: true } }, strategies: { type: "array", items: { type: "object", additionalProperties: true } }, openQuestions: { type: "array", items: { type: "string" } }, warnings: { type: "array", items: { type: "string" } } }, required: ["context", "assumptions", "personas", "resources", "interventions", "strategies", "openQuestions", "warnings"] };
function requireOpenAI(res) { if (!openai) { res.status(500).json({ error: "OPENAI_API_KEY fehlt. Setze die Variable in Coolify oder lokal in deiner Umgebung." }); return false; } return true; }
app.post("/api/import-scenario", async (req, res) => { try { if (!requireOpenAI(res)) return; const { text, documentType = "Konzept", analysisMode = "beratend" } = req.body || {}; if (!text || typeof text !== "string" || text.trim().length < 80) return res.status(400).json({ error: "Bitte füge einen längeren Konzepttext ein." }); if (text.length > 45000) return res.status(400).json({ error: "Der Text ist zu lang. Bitte kürzen oder in Abschnitten analysieren." }); const response = await openai.responses.create({ model: OPENAI_MODEL, input: [{ role: "system", content: "Du bist ein präziser Organisationsberater und Szenarioarchitekt. Erzeuge aus dem Dokument einen prüfbaren Szenarioentwurf, keine Diagnose. Arbeite nur mit Rollen, Archetypen und anonymisierten Stakeholdern. Formuliere auf Deutsch." }, { role: "user", content: `Dokumenttyp: ${documentType}\nAnalysemodus: ${analysisMode}\n\nErzeuge einen Szenarioentwurf nach dem JSON Schema.\n\nDokument:\n${text}` }], text: { format: { type: "json_schema", name: "scenario_draft", strict: true, schema: scenarioSchema } } }); res.json(JSON.parse(response.output_text)); } catch (e) { res.status(500).json({ error: "Szenarioimport fehlgeschlagen", details: process.env.NODE_ENV === "production" ? undefined : String(e) }); } });
app.post("/api/simulate", async (req, res) => { try { if (!requireOpenAI(res)) return; const { state } = req.body || {}; if (!state || typeof state !== "object") return res.status(400).json({ error: "state fehlt oder ist ungültig" }); const response = await openai.responses.create({ model: OPENAI_MODEL, input: [{ role: "system", content: "Du bist ein präziser Organisationsberater. Behandle alle Eingaben als Hypothesen, nicht als Tatsachendiagnose. Nutze exakt die vorgegebenen deutschen Abschnittsüberschriften." }, { role: "user", content: "Erzeuge einen Beratungsreport nach dem vorgegebenen JSON Schema. Nutze diese Eingabedaten:\n\n" + JSON.stringify(state, null, 2) }], text: { format: { type: "json_schema", name: "consulting_report", strict: true, schema: reportSchema } } }); res.json(JSON.parse(response.output_text)); } catch (e) { res.status(500).json({ error: "Simulation fehlgeschlagen", details: process.env.NODE_ENV === "production" ? undefined : String(e) }); } });

app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
app.listen(PORT, () => console.log(`KI-Kernel GPT läuft auf Port ${PORT}`));
