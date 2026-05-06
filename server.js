import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4";
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || "";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "";
const MAX_REQUEST_BYTES = process.env.MAX_REQUEST_BYTES || "2mb";

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: OPENAI_MODEL, openaiConfigured: Boolean(OPENAI_API_KEY) });
});

const reportSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    executiveSummary: { type: "string" },
    ausgangslage: { type: "string" },
    simulationsannahmen: { type: "string" },
    stakeholderanalyse: { type: "string" },
    ressourcenRisikolage: { type: "string" },
    phasenanalyse: { type: "string" },
    konfliktKoalitionsmuster: { type: "string" },
    kritischeKipppunkte: { type: "string" },
    interventionsoptionen: { type: "string" },
    entscheidungsmatrix: { type: "string" },
    massnahmenplan: { type: "string" },
    offeneFragen: { type: "string" },
    governanceHinweise: { type: "string" },
    grenzenDerSimulation: { type: "string" }
  },
  required: ["executiveSummary", "ausgangslage", "simulationsannahmen", "stakeholderanalyse", "ressourcenRisikolage", "phasenanalyse", "konfliktKoalitionsmuster", "kritischeKipppunkte", "interventionsoptionen", "entscheidungsmatrix", "massnahmenplan", "offeneFragen", "governanceHinweise", "grenzenDerSimulation"]
};

const scenarioSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    context: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        domain: { type: "string" },
        decisionQuestion: { type: "string" },
        goal: { type: "string" },
        boundaries: { type: "string" }
      },
      required: ["title", "domain", "decisionQuestion", "goal", "boundaries"]
    },
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

function requireOpenAI(res) {
  if (!openai) {
    res.status(500).json({ error: "OPENAI_API_KEY fehlt. Setze die Variable in Coolify oder lokal in deiner Umgebung." });
    return false;
  }
  return true;
}

app.post("/api/import-scenario", async (req, res) => {
  try {
    if (!requireOpenAI(res)) return;
    const { text, documentType = "Konzept", analysisMode = "beratend" } = req.body || {};
    if (!text || typeof text !== "string" || text.trim().length < 80) {
      return res.status(400).json({ error: "Bitte füge einen längeren Konzepttext ein." });
    }
    if (text.length > 45000) {
      return res.status(400).json({ error: "Der Text ist zu lang. Bitte kürzen oder in Abschnitten analysieren." });
    }

    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: [
          "Du bist ein präziser Organisationsberater und Szenarioarchitekt.",
          "Erzeuge aus dem Dokument einen prüfbaren Szenarioentwurf, keine Diagnose.",
          "Unterscheide explizit Genanntes, Abgeleitetes und Hypothesen.",
          "Arbeite nur mit Rollen, Archetypen und anonymisierten Stakeholdern.",
          "Keine personenbezogene Bewertung, keine Leistungsdiagnostik, keine echten Personenprofile.",
          "Formuliere auf Deutsch, klar und beratungsfähig."
        ].join("\n") },
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
        { role: "system", content: [
          "Du bist ein präziser Organisationsberater für KI-Readiness, Qualitätsmanagement, Beteiligung und Veränderungsprozesse.",
          "Behandle alle Eingaben als Hypothesen, nicht als Tatsachendiagnose.",
          "Erzeuge keine personenbezogene Leistungs-, Verhaltens- oder Widerstandsdiagnostik.",
          "Arbeite mit Rollen, Archetypen und anonymisierten Stakeholdern.",
          "Formuliere in deutscher Sprache, klar, beratungsfähig und entscheidungsorientiert."
        ].join("\n") },
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
app.listen(PORT, () => console.log(`KI-Kernel GPT läuft auf Port ${PORT}`));
