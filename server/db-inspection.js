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
