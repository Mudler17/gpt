import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import multer from "multer";

import { DATABASE_URL, STORAGE_MODE, maskDatabaseUrl, dbStatus, ensureSchema } from "./server/db.js";
import { dbCounts, dbAuditLog, dbProjects, dbProjectDetail, dbScenarios, dbScenarioDetail, dbAssignments } from "./server/db-inspection.js";
import { analyzeBackup, importBackup } from "./server/db-import.js";
import { extractDocumentHandler, importScenarioHandler, simulateHandler } from "./server/openai-routes.js";

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
  const separator = decoded.indexOf(":");
  const user = decoded.slice(0, separator);
  const pass = decoded.slice(separator + 1);
  if (user !== BASIC_AUTH_USER || pass !== BASIC_AUTH_PASSWORD) {
    res.setHeader("WWW-Authenticate", 'Basic realm="KI-Kernel GPT"');
    return res.status(401).send("Authentication required");
  }
  next();
}
app.use(basicAuth);

async function checkDatabaseForHealth() {
  if (STORAGE_MODE === "local") {
    return {
      active: false,
      reachable: null,
      tablesReady: null,
      missingTables: [],
      note: "Datenbankprüfung übersprungen, weil STORAGE_MODE=local. Die App nutzt weiterhin Browser-LocalStorage als Hauptspeicher."
    };
  }
  const status = await dbStatus();
  return {
    active: true,
    reachable: status.reachable,
    tablesReady: status.tablesReady,
    missingTables: status.missingTables || [],
    note: status.note
  };
}

app.get("/api/health", async (_req, res) => {
  const db = await checkDatabaseForHealth();
  res.json({
    ok: true,
    appVersion: "2.3-db-detail-restore",
    model: OPENAI_MODEL,
    openaiConfigured: Boolean(OPENAI_API_KEY),
    databaseConfigured: Boolean(DATABASE_URL),
    databaseActive: db.active,
    databaseReachable: db.reachable,
    databaseReachableNote: db.note,
    databaseTablesReady: db.tablesReady,
    databaseMissingTables: db.missingTables,
    databaseUrlPreview: maskDatabaseUrl(),
    storageMode: STORAGE_MODE,
    allowedStorageModes: ["local", "hybrid", "db"],
    maxRequestBytes: MAX_REQUEST_BYTES,
    maxUploadBytes: MAX_UPLOAD_BYTES,
    basicAuthEnabled: Boolean(BASIC_AUTH_USER && BASIC_AUTH_PASSWORD)
  });
});

app.get("/api/db/status", async (_req, res) => {
  try {
    res.json({ ok: true, storageMode: STORAGE_MODE, ...(await dbStatus()) });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
});
app.get("/api/db/counts", async (_req, res) => {
  try {
    res.json({ ok: true, ...(await dbCounts()) });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
});
app.get("/api/db/audit-log", async (req, res) => {
  try {
    res.json({ ok: true, items: await dbAuditLog(req.query.limit) });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
});
app.get("/api/db/projects", async (_req, res) => {
  try {
    res.json({ ok: true, items: await dbProjects() });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
});
app.get("/api/db/projects/:id", async (req, res) => {
  try {
    const detail = await dbProjectDetail(req.params.id);
    if (!detail) return res.status(404).json({ ok: false, error: "Projekt nicht gefunden." });
    res.json({ ok: true, ...detail });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
});
app.get("/api/db/scenarios", async (_req, res) => {
  try {
    res.json({ ok: true, items: await dbScenarios() });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
});
app.get("/api/db/scenarios/:id", async (req, res) => {
  try {
    const detail = await dbScenarioDetail(req.params.id);
    if (!detail) return res.status(404).json({ ok: false, error: "Szenario nicht gefunden." });
    res.json({ ok: true, ...detail });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
});
app.get("/api/db/assignments", async (_req, res) => {
  try {
    res.json({ ok: true, ...(await dbAssignments()) });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
});
app.post("/api/db/ensure-schema", async (req, res) => {
  try {
    if (req.body?.confirmation !== "SCHEMA ANLEGEN") {
      return res.status(400).json({ ok: false, error: "Bestätigungsphrase fehlt. Erforderlich: SCHEMA ANLEGEN" });
    }
    res.json({ ok: true, status: await ensureSchema() });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
});
app.post("/api/db/import-backup/dry-run", async (req, res) => {
  try {
    res.json({ ok: true, dryRun: true, analysis: analyzeBackup(req.body || {}) });
  } catch (error) {
    res.status(400).json({ ok: false, error: String(error?.message || error) });
  }
});
app.post("/api/db/import-backup", async (req, res) => {
  try {
    const { backup, confirmation } = req.body || {};
    if (!backup) return res.status(400).json({ ok: false, error: "backup fehlt." });
    res.json({ ok: true, result: await importBackup(backup, confirmation) });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
});

app.post("/api/extract-document", upload.single("file"), extractDocumentHandler);
app.post("/api/import-scenario", (req, res) => importScenarioHandler(req, res, openai, OPENAI_MODEL));
app.post("/api/simulate", (req, res) => simulateHandler(req, res, openai, OPENAI_MODEL));

app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
app.listen(PORT, () => console.log(`KI-Kernel GPT läuft auf Port ${PORT}`));
