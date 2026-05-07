import { withDb } from "./db.js";

export async function dbCounts() {
  return await withDb(async (pool) => {
    const tables = [
      "users",
      "projects",
      "scenarios",
      "project_scenarios",
      "scenario_versions",
      "phase_sets",
      "consulting_cases",
      "reports",
      "imports",
      "audit_log"
    ];
    const counts = {};
    for (const table of tables) {
      const result = await pool.query(`select count(*)::int as count from ${table}`);
      counts[table] = Number(result.rows[0].count);
    }
    const lastImport = (
      await pool.query(
        "select id, action, metadata, created_at from audit_log where action='import_local_backup' order by created_at desc limit 1"
      )
    ).rows[0] || null;
    return { counts, lastImport };
  });
}

export async function dbAuditLog(limit = 20) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return await withDb(async (pool) => {
    const result = await pool.query(
      "select id, entity_type, entity_id, action, metadata, created_at from audit_log order by created_at desc limit $1",
      [safeLimit]
    );
    return result.rows;
  });
}

export async function dbProjects() {
  return await withDb(async (pool) => {
    const result = await pool.query(`
      select
        p.id,
        p.title,
        p.status,
        p.priority,
        p.tags,
        p.decision_need,
        p.next_step,
        p.created_at,
        p.updated_at,
        count(distinct ps.scenario_id)::int as scenario_count
      from projects p
      left join project_scenarios ps on ps.project_id = p.id
      group by p.id
      order by p.updated_at desc
    `);
    return result.rows;
  });
}

export async function dbProjectDetail(id) {
  return await withDb(async (pool) => {
    const project = (
      await pool.query(
        `select id, title, description, status, priority, tags, decision_need, next_step, boundaries, notes, created_at, updated_at
         from projects
         where id=$1`,
        [id]
      )
    ).rows[0] || null;
    if (!project) return null;
    const scenarios = (
      await pool.query(
        `select s.id, s.title, s.name, s.description, s.current_version_id, ps.relation_type, ps.sort_order, s.created_at, s.updated_at
         from project_scenarios ps
         join scenarios s on s.id = ps.scenario_id
         where ps.project_id=$1
         order by ps.sort_order asc, s.updated_at desc`,
        [id]
      )
    ).rows;
    return { project, scenarios };
  });
}

export async function dbScenarios() {
  return await withDb(async (pool) => {
    const result = await pool.query(`
      select
        s.id,
        s.title,
        s.name,
        s.description,
        s.current_version_id,
        s.created_at,
        s.updated_at,
        count(distinct ps.project_id)::int as project_count,
        count(distinct sv.id)::int as version_count
      from scenarios s
      left join project_scenarios ps on ps.scenario_id = s.id
      left join scenario_versions sv on sv.scenario_id = s.id
      group by s.id
      order by s.updated_at desc
    `);
    return result.rows;
  });
}

export async function dbScenarioDetail(id) {
  return await withDb(async (pool) => {
    const scenario = (
      await pool.query(
        `select id, title, name, description, current_version_id, created_at, updated_at
         from scenarios
         where id=$1`,
        [id]
      )
    ).rows[0] || null;
    if (!scenario) return null;
    const versions = (
      await pool.query(
        `select id, version_number, source, state_json, note, created_by, created_at
         from scenario_versions
         where scenario_id=$1
         order by version_number desc, created_at desc`,
        [id]
      )
    ).rows;
    const currentVersion = versions.find((v) => v.id === scenario.current_version_id) || versions[0] || null;
    const projects = (
      await pool.query(
        `select p.id, p.title, p.status, p.priority, ps.relation_type, ps.sort_order
         from project_scenarios ps
         join projects p on p.id = ps.project_id
         where ps.scenario_id=$1
         order by ps.sort_order asc, p.title asc`,
        [id]
      )
    ).rows;
    const localStoragePackage = currentVersion ? {
      id: scenario.id,
      name: scenario.name || scenario.title,
      createdAt: scenario.created_at,
      updatedAt: scenario.updated_at,
      source: "db-restore",
      state: currentVersion.state_json || {}
    } : null;
    return { scenario, currentVersion, versions, projects, localStoragePackage };
  });
}

export async function dbAssignments() {
  return await withDb(async (pool) => {
    const unassignedScenarios = (
      await pool.query(`
        select s.id, s.title, s.name, s.description, s.updated_at
        from scenarios s
        left join project_scenarios ps on ps.scenario_id = s.id
        where ps.scenario_id is null
        order by s.updated_at desc
      `)
    ).rows;

    const multiProjectScenarios = (
      await pool.query(`
        select
          s.id,
          s.title,
          count(distinct ps.project_id)::int as project_count,
          array_agg(distinct p.title) as project_titles
        from scenarios s
        join project_scenarios ps on ps.scenario_id = s.id
        join projects p on p.id = ps.project_id
        group by s.id, s.title
        having count(distinct ps.project_id) > 1
        order by project_count desc, s.title asc
      `)
    ).rows;

    const projectsWithoutScenarios = (
      await pool.query(`
        select p.id, p.title, p.status, p.updated_at
        from projects p
        left join project_scenarios ps on ps.project_id = p.id
        where ps.project_id is null
        order by p.updated_at desc
      `)
    ).rows;

    return { unassignedScenarios, multiProjectScenarios, projectsWithoutScenarios };
  });
}
