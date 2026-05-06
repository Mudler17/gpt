import pg from "pg";

const { Pool } = pg;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function createPool() {
  if (!process.env.DATABASE_URL) return null;
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export async function dbStatus() {
  const pool = createPool();
  if (!pool) return { configured: false, reachable: false, tablesReady: false, note: "DATABASE_URL ist nicht gesetzt." };
  try {
    const ping = await pool.query("select 1 as ok");
    const tables = await pool.query(`
      select table_name from information_schema.tables
      where table_schema='public'
      and table_name in ('users','projects','scenarios','project_scenarios','scenario_versions','phase_sets','consulting_cases','audit_log')
      order by table_name
    `);
    const names = tables.rows.map((r) => r.table_name);
    const required = ['users','projects','scenarios','project_scenarios','scenario_versions','phase_sets','consulting_cases','audit_log'];
    const missing = required.filter((x) => !names.includes(x));
    return { configured: true, reachable: ping.rows?.[0]?.ok === 1, tablesReady: missing.length === 0, existingTables: names, missingTables: missing, note: missing.length ? "Datenbank erreichbar, aber Tabellen fehlen." : "Datenbank erreichbar und Basistabellen vorhanden." };
  } catch (error) {
    return { configured: true, reachable: false, tablesReady: false, note: String(error?.message || error).slice(0, 800) };
  } finally {
    await pool.end().catch(() => {});
  }
}

export async function ensureSchema() {
  const pool = createPool();
  if (!pool) throw new Error("DATABASE_URL ist nicht gesetzt.");
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`
      create table if not exists users (
        id text primary key,
        email text unique,
        display_name text,
        role text not null default 'owner',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create table if not exists projects (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        title text not null,
        description text,
        status text not null default 'Vorbereitung',
        priority text not null default 'mittel',
        tags jsonb,
        decision_need text,
        next_step text,
        boundaries text,
        notes text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        archived_at timestamptz
      );
      create table if not exists scenarios (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        title text not null,
        name text,
        description text,
        current_version_id text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        archived_at timestamptz
      );
      create table if not exists project_scenarios (
        id text primary key,
        project_id text not null references projects(id) on delete cascade,
        scenario_id text not null references scenarios(id) on delete cascade,
        relation_type text not null default 'contains',
        sort_order integer not null default 0,
        created_at timestamptz not null default now(),
        unique(project_id, scenario_id)
      );
      create table if not exists scenario_versions (
        id text primary key,
        scenario_id text not null references scenarios(id) on delete cascade,
        version_number integer not null,
        source text,
        state_json jsonb not null,
        note text,
        created_by text,
        created_at timestamptz not null default now(),
        unique(scenario_id, version_number)
      );
      create table if not exists phase_sets (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        name text not null,
        phases jsonb not null,
        is_builtin boolean not null default false,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create table if not exists scenario_phases (
        id text primary key,
        scenario_id text not null references scenarios(id) on delete cascade,
        scenario_version_id text,
        phase_set_id text,
        phases_json jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create table if not exists scenario_relations (
        id text primary key,
        scenario_id text not null references scenarios(id) on delete cascade,
        scenario_version_id text,
        relations_json jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create table if not exists consulting_cases (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        project_id text references projects(id) on delete set null,
        scenario_id text references scenarios(id) on delete set null,
        title text not null,
        status text not null default 'Vorbereitung',
        priority text not null default 'mittel',
        mandate text,
        decision_need text,
        deliverable text,
        boundaries text,
        consulting_notes text,
        reflection text,
        todos jsonb,
        journal jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create table if not exists reports (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        project_id text references projects(id) on delete set null,
        scenario_id text references scenarios(id) on delete set null,
        report_type text not null,
        title text not null,
        content text,
        content_json jsonb,
        created_at timestamptz not null default now()
      );
      create table if not exists imports (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        project_id text references projects(id) on delete set null,
        filename text,
        document_type text,
        analysis_mode text,
        extracted_text text,
        draft_json jsonb,
        created_at timestamptz not null default now()
      );
      create table if not exists audit_log (
        id text primary key,
        user_id text references users(id) on delete set null,
        entity_type text not null,
        entity_id text,
        action text not null,
        metadata jsonb,
        created_at timestamptz not null default now()
      );
    `);
    await client.query("commit");
    return await dbStatus();
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function normalizeBackup(raw) {
  if (raw?.schema === "ki-kernel-local-backup") return raw.data || {};
  if (raw?.data && (raw.data.projects || raw.data.scenarios || raw.data.phaseSets)) return raw.data;
  return raw || {};
}

export function analyzeBackup(raw) {
  const data = normalizeBackup(raw);
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
  const phaseSets = Array.isArray(data.phaseSets) ? data.phaseSets : [];
  const consultingCases = Array.isArray(data.consultingCases) ? data.consultingCases : [];
  const importDrafts = Array.isArray(data.importDrafts) ? data.importDrafts : [];
  const missingScenarioRefs = projects.flatMap((project) => (Array.isArray(project.scenarioIds) ? project.scenarioIds : [])
    .filter((scenarioId) => !scenarios.some((scenario) => scenario.id === scenarioId))
    .map((scenarioId) => ({ projectId: project.id, projectTitle: project.title, scenarioId })));
  return { ok: true, counts: { projects: projects.length, scenarios: scenarios.length, phaseSets: phaseSets.length, consultingCases: consultingCases.length, importDrafts: importDrafts.length }, missingScenarioRefs, warnings: missingScenarioRefs.length ? ["Einige Projekt-Szenario-Verweise zeigen auf nicht vorhandene Szenarien."] : [] };
}

export async function importBackup(raw, options = {}) {
  const { confirmation, dryRun = true } = options;
  const analysis = analyzeBackup(raw);
  if (dryRun) return { dryRun: true, imported: null, analysis };
  if (confirmation !== "IMPORT IN DATENBANK") throw new Error("Bestätigungsphrase fehlt. Erforderlich: IMPORT IN DATENBANK");
  const data = normalizeBackup(raw);
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
  const phaseSets = Array.isArray(data.phaseSets) ? data.phaseSets : [];
  const consultingCases = Array.isArray(data.consultingCases) ? data.consultingCases : [];
  const pool = createPool();
  if (!pool) throw new Error("DATABASE_URL ist nicht gesetzt.");
  const client = await pool.connect();
  const userId = "local_owner";
  const imported = { users: 0, projects: 0, scenarios: 0, projectScenarios: 0, scenarioVersions: 0, phaseSets: 0, consultingCases: 0, auditLog: 0 };
  try {
    await client.query("begin");
    await client.query(`insert into users(id,email,display_name,role) values($1,$2,$3,$4) on conflict(id) do update set updated_at=now()`, [userId, null, "Local Owner", "owner"]);
    imported.users = 1;
    for (const s of scenarios) {
      const id = s.id || uid("scenario");
      const title = s.state?.context?.title || s.name || "Szenario";
      await client.query(`insert into scenarios(id,user_id,title,name,description,created_at,updated_at) values($1,$2,$3,$4,$5,now(),now()) on conflict(id) do update set title=excluded.title,name=excluded.name,description=excluded.description,updated_at=now()`, [id, userId, title, s.name || title, s.state?.context?.decisionQuestion || null]);
      const versionId = `version_${id}_1`;
      await client.query(`insert into scenario_versions(id,scenario_id,version_number,source,state_json,note,created_by) values($1,$2,1,$3,$4,$5,$6) on conflict(scenario_id,version_number) do update set state_json=excluded.state_json,note=excluded.note`, [versionId, id, "localStorage-import", s.state || {}, "Import aus LocalStorage-Backup", userId]);
      await client.query(`update scenarios set current_version_id=$1 where id=$2`, [versionId, id]);
      imported.scenarios += 1;
      imported.scenarioVersions += 1;
    }
    for (const p of projects) {
      const id = p.id || uid("project");
      await client.query(`insert into projects(id,user_id,title,description,status,priority,tags,decision_need,next_step,boundaries,notes,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now()) on conflict(id) do update set title=excluded.title,description=excluded.description,status=excluded.status,priority=excluded.priority,tags=excluded.tags,decision_need=excluded.decision_need,next_step=excluded.next_step,boundaries=excluded.boundaries,notes=excluded.notes,updated_at=now()`, [id, userId, p.title || "Projekt", p.description || null, p.status || "Vorbereitung", p.priority || "mittel", JSON.stringify(p.tags || []), p.decisionNeed || null, p.nextStep || null, p.boundaries || null, p.notes || null]);
      imported.projects += 1;
      const scenarioIds = Array.isArray(p.scenarioIds) ? p.scenarioIds : [];
      let order = 0;
      for (const scenarioId of scenarioIds) {
        if (!scenarios.some((s) => s.id === scenarioId)) continue;
        await client.query(`insert into project_scenarios(id,project_id,scenario_id,relation_type,sort_order) values($1,$2,$3,'contains',$4) on conflict(project_id,scenario_id) do update set sort_order=excluded.sort_order`, [`ps_${id}_${scenarioId}`, id, scenarioId, order++]);
        imported.projectScenarios += 1;
      }
    }
    for (const set of phaseSets) {
      const id = set.id || uid("phase_set");
      await client.query(`insert into phase_sets(id,user_id,name,phases,is_builtin,created_at,updated_at) values($1,$2,$3,$4,false,now(),now()) on conflict(id) do update set name=excluded.name,phases=excluded.phases,updated_at=now()`, [id, userId, set.name || "Phasen-Set", JSON.stringify(set.phases || [])]);
      imported.phaseSets += 1;
    }
    for (const c of consultingCases) {
      const id = c.id || uid("case");
      await client.query(`insert into consulting_cases(id,user_id,title,status,priority,mandate,decision_need,deliverable,boundaries,consulting_notes,reflection,todos,journal,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now(),now()) on conflict(id) do update set title=excluded.title,status=excluded.status,priority=excluded.priority,mandate=excluded.mandate,decision_need=excluded.decision_need,deliverable=excluded.deliverable,boundaries=excluded.boundaries,consulting_notes=excluded.consulting_notes,reflection=excluded.reflection,todos=excluded.todos,journal=excluded.journal,updated_at=now()`, [id, userId, c.title || "Beratungsfall", c.status || "Vorbereitung", c.priority || "mittel", c.mandate || null, c.decisionNeed || null, c.deliverable || null, c.boundaries || null, c.consultingNotes || c.notes || null, c.reflection || null, JSON.stringify(c.todos || []), JSON.stringify(c.journal || [])]);
      imported.consultingCases += 1;
    }
    await client.query(`insert into audit_log(id,user_id,entity_type,entity_id,action,metadata) values($1,$2,'backup',null,'import_local_backup',$3)`, [uid("audit"), userId, JSON.stringify({ imported, analysis })]);
    imported.auditLog = 1;
    await client.query("commit");
    return { dryRun: false, imported, analysis };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
}
