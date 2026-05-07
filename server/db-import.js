import { withDb } from "./db.js";

export function normalizeBackup(raw) {
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
  const missingScenarioRefs = projects.flatMap((project) =>
    (Array.isArray(project.scenarioIds) ? project.scenarioIds : [])
      .filter((scenarioId) => !scenarios.some((scenario) => scenario.id === scenarioId))
      .map((scenarioId) => ({ projectId: project.id, projectTitle: project.title, scenarioId }))
  );
  return {
    ok: true,
    counts: {
      projects: projects.length,
      scenarios: scenarios.length,
      phaseSets: phaseSets.length,
      consultingCases: consultingCases.length,
      importDrafts: importDrafts.length
    },
    missingScenarioRefs,
    warnings: missingScenarioRefs.length
      ? ["Einige Projekt-Szenario-Verweise zeigen auf nicht vorhandene Szenarien."]
      : []
  };
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function importBackup(raw, confirmation) {
  if (confirmation !== "IMPORT IN DATENBANK") {
    throw new Error("Bestätigungsphrase fehlt. Erforderlich: IMPORT IN DATENBANK");
  }
  const data = normalizeBackup(raw);
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
  const phaseSets = Array.isArray(data.phaseSets) ? data.phaseSets : [];
  const consultingCases = Array.isArray(data.consultingCases) ? data.consultingCases : [];
  const analysis = analyzeBackup(raw);

  return await withDb(async (pool) => {
    const client = await pool.connect();
    const userId = "local_owner";
    const imported = {
      users: 0,
      projects: 0,
      scenarios: 0,
      projectScenarios: 0,
      scenarioVersions: 0,
      phaseSets: 0,
      consultingCases: 0,
      auditLog: 0
    };

    try {
      await client.query("begin");
      await client.query(
        "insert into users(id,email,display_name,role) values($1,$2,$3,$4) on conflict(id) do update set updated_at=now()",
        [userId, null, "Local Owner", "owner"]
      );
      imported.users = 1;

      for (const scenario of scenarios) {
        const id = scenario.id || uid("scenario");
        const title = scenario.state?.context?.title || scenario.name || "Szenario";
        await client.query(
          "insert into scenarios(id,user_id,title,name,description,created_at,updated_at) values($1,$2,$3,$4,$5,now(),now()) on conflict(id) do update set title=excluded.title,name=excluded.name,description=excluded.description,updated_at=now()",
          [id, userId, title, scenario.name || title, scenario.state?.context?.decisionQuestion || null]
        );
        const versionId = `version_${id}_1`;
        await client.query(
          "insert into scenario_versions(id,scenario_id,version_number,source,state_json,note,created_by) values($1,$2,1,$3,$4,$5,$6) on conflict(scenario_id,version_number) do update set state_json=excluded.state_json,note=excluded.note",
          [versionId, id, "localStorage-import", JSON.stringify(scenario.state || {}), "Import aus LocalStorage-Backup", userId]
        );
        await client.query("update scenarios set current_version_id=$1 where id=$2", [versionId, id]);
        imported.scenarios += 1;
        imported.scenarioVersions += 1;
      }

      for (const project of projects) {
        const id = project.id || uid("project");
        await client.query(
          "insert into projects(id,user_id,title,description,status,priority,tags,decision_need,next_step,boundaries,notes,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now()) on conflict(id) do update set title=excluded.title,description=excluded.description,status=excluded.status,priority=excluded.priority,tags=excluded.tags,decision_need=excluded.decision_need,next_step=excluded.next_step,boundaries=excluded.boundaries,notes=excluded.notes,updated_at=now()",
          [
            id,
            userId,
            project.title || "Projekt",
            project.description || null,
            project.status || "Vorbereitung",
            project.priority || "mittel",
            JSON.stringify(project.tags || []),
            project.decisionNeed || null,
            project.nextStep || null,
            project.boundaries || null,
            project.notes || null
          ]
        );
        imported.projects += 1;
        let order = 0;
        for (const scenarioId of Array.isArray(project.scenarioIds) ? project.scenarioIds : []) {
          if (!scenarios.some((scenario) => scenario.id === scenarioId)) continue;
          await client.query(
            "insert into project_scenarios(id,project_id,scenario_id,relation_type,sort_order) values($1,$2,$3,'contains',$4) on conflict(project_id,scenario_id) do update set sort_order=excluded.sort_order",
            [`ps_${id}_${scenarioId}`, id, scenarioId, order++]
          );
          imported.projectScenarios += 1;
        }
      }

      for (const set of phaseSets) {
        const id = set.id || uid("phase_set");
        await client.query(
          "insert into phase_sets(id,user_id,name,phases,is_builtin,created_at,updated_at) values($1,$2,$3,$4,false,now(),now()) on conflict(id) do update set name=excluded.name,phases=excluded.phases,updated_at=now()",
          [id, userId, set.name || "Phasen-Set", JSON.stringify(set.phases || [])]
        );
        imported.phaseSets += 1;
      }

      for (const item of consultingCases) {
        const id = item.id || uid("case");
        await client.query(
          "insert into consulting_cases(id,user_id,title,status,priority,mandate,decision_need,deliverable,boundaries,consulting_notes,reflection,todos,journal,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now(),now()) on conflict(id) do update set title=excluded.title,status=excluded.status,priority=excluded.priority,mandate=excluded.mandate,decision_need=excluded.decision_need,deliverable=excluded.deliverable,boundaries=excluded.boundaries,consulting_notes=excluded.consulting_notes,reflection=excluded.reflection,todos=excluded.todos,journal=excluded.journal,updated_at=now()",
          [
            id,
            userId,
            item.title || "Beratungsfall",
            item.status || "Vorbereitung",
            item.priority || "mittel",
            item.mandate || null,
            item.decisionNeed || null,
            item.deliverable || null,
            item.boundaries || null,
            item.consultingNotes || item.notes || null,
            item.reflection || null,
            JSON.stringify(item.todos || []),
            JSON.stringify(item.journal || [])
          ]
        );
        imported.consultingCases += 1;
      }

      imported.auditLog = 1;
      await client.query(
        "insert into audit_log(id,user_id,entity_type,entity_id,action,metadata) values($1,$2,'backup',null,'import_local_backup',$3)",
        [uid("audit"), userId, JSON.stringify({ imported, analysis })]
      );

      await client.query("commit");
      return { imported, analysis };
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  });
}
