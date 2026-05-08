export const DATABASE_URL = process.env.DATABASE_URL || "";
export const STORAGE_MODE = process.env.STORAGE_MODE || "local";

export const REQUIRED_TABLES = [
  "users",
  "projects",
  "scenarios",
  "project_scenarios",
  "scenario_versions",
  "phase_sets",
  "consulting_cases",
  "audit_log"
];
let sharedPoolPromise = null;
export function maskDatabaseUrl(url = DATABASE_URL) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}`;
  } catch {
    return "configured-but-not-parseable";
  }
}
export async function createPool() {
  if (!DATABASE_URL) return null;

  if (!sharedPoolPromise) {
    sharedPoolPromise = import("pg")
      .then((mod) => {
        const Pool = mod.default?.Pool || mod.Pool;
        return new Pool({ connectionString: DATABASE_URL });
      })
      .catch((error) => {
        sharedPoolPromise = null;
        throw error;
      });
  }

  return sharedPoolPromise;
}

export async function closePool() {
  if (!sharedPoolPromise) return;

  const pool = await sharedPoolPromise;
  await pool.end();
  sharedPoolPromise = null;
}

export async function withDb(fn) {
  const pool = await createPool();
  if (!pool) throw new Error("DATABASE_URL ist nicht gesetzt.");

  return await fn(pool);
}

export async function dbStatus() {
  if (!DATABASE_URL) {
    return {
      configured: false,
      reachable: false,
      tablesReady: false,
      note: "DATABASE_URL ist nicht gesetzt."
    };
  }
  try {
    return await withDb(async (pool) => {
      await pool.query("select 1");
      const result = await pool.query(
        `select table_name
         from information_schema.tables
         where table_schema = 'public'
         and table_name = any($1)
         order by table_name`,
        [REQUIRED_TABLES]
      );
      const existingTables = result.rows.map((row) => row.table_name);
      const missingTables = REQUIRED_TABLES.filter((name) => !existingTables.includes(name));
      return {
        configured: true,
        reachable: true,
        tablesReady: missingTables.length === 0,
        existingTables,
        missingTables,
        note: missingTables.length
          ? "Datenbank erreichbar, aber Tabellen fehlen."
          : "Datenbank erreichbar und Basistabellen vorhanden."
      };
    });
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      tablesReady: false,
      note: String(error?.message || error).slice(0, 800)
    };
  }
}

export async function ensureSchema() {
  return await withDb(async (pool) => {
    await pool.query(`
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
    return await dbStatus();
  });
}
