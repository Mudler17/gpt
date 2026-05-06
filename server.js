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
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4";
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || "";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "";
const MAX_REQUEST_BYTES = process.env.MAX_REQUEST_BYTES || "2mb";
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 8 * 1024 * 1024);
const DATABASE_URL = process.env.DATABASE_URL || "";
const STORAGE_MODE = process.env.STORAGE_MODE || "local";

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });
let prisma = null;
let prismaInitError = null;

async function getPrisma() {
  if (!DATABASE_URL) return null;
  if (prisma) return prisma;
  try {
    const mod = await import("@prisma/client");
    prisma = new mod.PrismaClient();
    return prisma;
  } catch (error) {
    prismaInitError = error;
    return null;
  }
}

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
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);
  if (user !== BASIC_AUTH_USER || pass !== BASIC_AUTH_PASSWORD) {
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

async function checkDatabase() {
  if (!DATABASE_URL) return { reachable: false, note: "DATABASE_URL ist nicht gesetzt." };
  const client = await getPrisma();
  if (!client) return { reachable: false, note: `Prisma konnte nicht initialisiert werden: ${String(prismaInitError?.message || prismaInitError || "unbekannter Fehler").slice(0, 500)}` };
  try {
    await client.$queryRaw`SELECT 1`;
    return { reachable: true, note: "Datenbankverbindung erfolgreich." };
  } catch (error) {
    return { reachable: false, note: String(error?.message || error).slice(0, 500) };
  }
}

app.get("/api/health", async (_req, res) => {
  const db = await checkDatabase();
  res.json({
    ok: true,
    appVersion: "1.8-prisma-connected-safe",
    model: OPENAI_MODEL,
    openaiConfigured: Boolean(OPENAI_API_KEY),
    databaseConfigured: Boolean(DATABASE_URL),
    databaseReachable: db.reachable,
    databaseReachableNote: db.note,
    databaseUrlPreview: maskDatabaseUrl(DATABASE_URL),
    storageMode: STORAGE_MODE,
    allowedStorageModes: ["local", "hybrid", "db"],
    maxRequestBytes: MAX_REQUEST_BYTES,
    maxUploadBytes: MAX_UPLOAD_BYTES,
    basicAuthEnabled: Boolean(BASIC_AUTH_USER && BASIC_AUTH_PASSWORD)
  });
});

function fileExtension(name = "") {
  return name.toLowerCase().split(".").pop() || "";
}

app.post("/api/extract-document", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Keine Datei übermittelt." });
    const ext = fileExtension(file.originalname);
    let text = "";
    if (["txt", "md", "json"].includes(ext) || file.mimetype?.startsWith("text/")) {
      text = file.buffer.toString("utf8");
    } else if (ext === "docx" || file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value || "";
    } else if (ext === "pdf" || file.mimetype === "application/pdf") {
      const result = await pdfParse(file.buffer);
      text = result.text || "";
    } else {
      return res.status(400).json({ error: "Dateityp nicht unterstützt. Unterstützt: TXT, MD, JSON, DOCX, PDF." });
    }
    const clean = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
    if (!clean) return res.status(422).json({ error: "Es konnte kein Text extrahiert werden. Bei gescannten PDFs ist OCR nötig; das ist noch nicht aktiviert." });
    res.json({ filename: file.originalname, mimeType: file.mimetype, bytes: file.size, characters: clean.length, text: clean.slice(0, 120000), truncated: clean.length > 120000 });
  } catch (error) {
    console.error("/api/extract-document error", error);
    res.status(500).json({ error: "Dokumentextraktion fehlgeschlagen", details: process.env.NODE_ENV === "production" ? undefined : String(error) });
  }
});

const reportSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    "Executive Summary": { type: "string" },
    "Ausgangslage": { type: "string" },
    "Simulationsannahmen": { type: "string" },
    "Persona- und Stakeholderanalyse": { type: "string" },
    "Ressourcen- und Risikolage": { type: "string" },
    "Phasenanalyse": { type: "string" },
    "Konflikt- und Koalitionsmuster": { type: "string" },
    "Kritische Kipppunkte": { type: "string" },
    "Interventionsoptionen": { type: "string" },
    "Entscheidungsmatrix": { type: "string" },
    "Maßnahmenplan": { type: "string" },
    "Offene Fragen": { type: "string" },
    "Datenschutz-/Governance-Hinweise": { type: "string" },
    "Grenzen der Simulation": { type: "string" }
  },
  required: ["Executive Summary", "Ausgangslage", "Simulationsannahmen", "Persona- und Stakeholderanalyse", "Ressourcen- und Risikolage", "Phasenanalyse", "Konflikt- und Koalitionsmuster", "Kritische Kipppunkte", "Interventionsoptionen", "Entscheidungsmatrix", "Maßnahmenplan", "Offene Fragen", "Datenschutz-/Governance-Hinweise", "Grenzen der Simulation"]
};

const scenarioSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    context: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, domain: { type: "string" }, decisionQuestion: { type: "string" }, goal: { type: "string" }, boundaries: { type: "string" } }, required: ["title", "domain", "decisionQuestion", "goal", "boundaries"] },
    assumptions: { type: "array", items: { type: "object", additionalProperties: false, properties: { text: { type: "string" }, source: { type: "string" }, evidence: { type: "string", enum: ["niedrig", "mittel", "hoch"] }, uncertainty: { type: "string", enum: ["niedrig", "mittel", "hoch"] }, sensitivity: { type: "string" }, sourceStatus: { type: "string", enum: ["explizit", "abgeleitet", "Hypothese"] }, sourceExcerpt: { type: "string" } }, required: ["text", "source", "evidence", "uncertainty", "sensitivity", "sourceStatus", "sourceExcerpt"] } },
    personas: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, role: { type: "string" }, stance: { type: "string" }, influence: { type: "integer", minimum: 1, maximum: 5 }, affectedness: { type: "integer", minimum: 1, maximum: 5 }, trust: { type: "integer", minimum: 1, maximum: 5 }, aiLiteracy: { type: "integer", minimum: 1, maximum: 5 }, riskSense: { type: "integer", minimum: 1, maximum: 5 }, changeEnergy: { type: "integer", minimum: 1, maximum: 5 }, informalRole: { type: "string" }, conflictStyle: { type: "string" }, trigger: { type: "string" }, learningNeed: { type: "string" }, communicationNeed: { type: "string" }, sourceStatus: { type: "string", enum: ["explizit", "abgeleitet", "Hypothese"] } }, required: ["name", "role", "stance", "influence", "affectedness", "trust", "aiLiteracy", "riskSense", "changeEnergy", "informalRole", "conflictStyle", "trigger", "learningNeed", "communicationNeed", "sourceStatus"] } },
    resources: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, type: { type: "string" }, current: { type: "integer", minimum: 1, maximum: 5 }, target: { type: "integer", minimum: 1, maximum: 5 }, direction: { type: "string", enum: ["high_good", "low_good"] }, trend: { type: "string" }, bottleneck: { type: "string" }, owner: { type: "string" }, sourceStatus: { type: "string", enum: ["explizit", "abgeleitet", "Hypothese"] } }, required: ["name", "type", "current", "target", "direction", "trend", "bottleneck", "owner", "sourceStatus"] } },
    interventions: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, timing: { type: "string" }, target: { type: "string" }, benefit: { type: "string" }, sideEffect: { type: "string" }, effort: { type: "string", enum: ["niedrig", "mittel", "hoch"] }, sourceStatus: { type: "string", enum: ["explizit", "abgeleitet", "Hypothese"] } }, required: ["name", "timing", "target", "benefit", "sideEffect", "effort", "sourceStatus"] } },
    strategies: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, description: { type: "string" }, speed: { type: "integer", minimum: 1, maximum: 5 }, speedText: { type: "string" }, acceptance: { type: "integer", minimum: 1, maximum: 5 }, acceptanceText: { type: "string" }, control: { type: "integer", minimum: 1, maximum: 5 }, controlText: { type: "string" }, innovation: { type: "integer", minimum: 1, maximum: 5 }, innovationText: { type: "string" }, risk: { type: "integer", minimum: 1, maximum: 5 }, riskText: { type: "string" }, conditions: { type: "string" }, failureMode: { type: "string" }, decisionSignal: { type: "string" }, sourceStatus: { type: "string", enum: ["explizit", "abgeleitet", "Hypothese"] } }, required: ["name", "description", "speed", "speedText", "acceptance", "acceptanceText", "control", "controlText", "innovation", "innovationText", "risk", "riskText", "conditions", "failureMode", "decisionSignal", "sourceStatus"] } },
    openQuestions: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } }
  },
  required: ["context", "assumptions", "personas", "resources", "interventions", "strategies", "openQuestions", "warnings"]
};

function requireOpenAI(res) { if (!openai) { res.status(500).json({ error: "OPENAI_API_KEY fehlt. Setze die Variable in Coolify oder lokal in deiner Umgebung." }); return false; } return true; }

app.post("/api/import-scenario", async (req, res) => {
  try {
    if (!requireOpenAI(res)) return;
    const { text, documentType = "Konzept", analysisMode = "beratend" } = req.body || {};
    if (!text || typeof text !== "string" || text.trim().length < 80) return res.status(400).json({ error: "Bitte füge einen längeren Konzepttext ein." });
    if (text.length > 45000) return res.status(400).json({ error: "Der Text ist zu lang. Bitte kürzen oder in Abschnitten analysieren." });
    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: ["Du bist ein präziser Organisationsberater und Szenarioarchitekt.", "Erzeuge aus dem Dokument einen prüfbaren Szenarioentwurf, keine Diagnose.", "Unterscheide explizit Genanntes, Abgeleitetes und Hypothesen.", "Arbeite nur mit Rollen, Archetypen und anonymisierten Stakeholdern.", "Keine personenbezogene Bewertung, keine Leistungsdiagnostik, keine echten Personenprofile.", "Formuliere auf Deutsch, klar und beratungsfähig."].join("\n") },
        { role: "user", content: `Dokumenttyp: ${documentType}\nAnalysemodus: ${analysisMode}\n\nErzeuge einen Szenarioentwurf nach dem JSON Schema.\n\nDokument:\n${text}` }
      ],
      text: { format: { type: "json_schema", name: "scenario_draft", strict: true, schema: scenarioSchema } }
    });
    res.json(JSON.parse(response.output_text));
  } catch (error) {
    console.error("/api/import-scenario error", error);
    res.status(500).json({ error: "Szenarioimport fehlgeschlagen", details: process.env.NODE_ENV === "production" ? undefined : String(error) });
  }
});

app.post("/api/simulate", async (req, res) => {
  try {
    if (!requireOpenAI(res)) return;
    const { state } = req.body || {};
    if (!state || typeof state !== "object") return res.status(400).json({ error: "state fehlt oder ist ungültig" });
    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: ["Du bist ein präziser Organisationsberater für KI-Readiness, Qualitätsmanagement, Beteiligung und Veränderungsprozesse.", "Behandle alle Eingaben als Hypothesen, nicht als Tatsachendiagnose.", "Erzeuge keine personenbezogene Leistungs-, Verhaltens- oder Widerstandsdiagnostik.", "Arbeite mit Rollen, Archetypen und anonymisierten Stakeholdern.", "Formuliere in deutscher Sprache, klar, beratungsfähig und entscheidungsorientiert.", "Nutze exakt die vorgegebenen deutschen Abschnittsüberschriften aus dem JSON Schema."].join("\n") },
        { role: "user", content: "Erzeuge einen Beratungsreport nach dem vorgegebenen JSON Schema. Nutze diese Eingabedaten:\n\n" + JSON.stringify(state, null, 2) }
      ],
      text: { format: { type: "json_schema", name: "consulting_report", strict: true, schema: reportSchema } }
    });
    res.json(JSON.parse(response.output_text));
  } catch (error) {
    console.error("/api/simulate error", error);
    res.status(500).json({ error: "Simulation fehlgeschlagen", details: process.env.NODE_ENV === "production" ? undefined : String(error) });
  }
});

app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));

async function shutdown() {
  const client = prisma || await getPrisma();
  if (client) await client.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

app.listen(PORT, () => console.log(`KI-Kernel GPT läuft auf Port ${PORT}`));
