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
const MAX_REQUEST_BYTES = process.env.MAX_REQUEST_BYTES || "1mb";

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
  const separatorIndex = decoded.indexOf(":");
  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);

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
  required: [
    "executiveSummary",
    "ausgangslage",
    "simulationsannahmen",
    "stakeholderanalyse",
    "ressourcenRisikolage",
    "phasenanalyse",
    "konfliktKoalitionsmuster",
    "kritischeKipppunkte",
    "interventionsoptionen",
    "entscheidungsmatrix",
    "massnahmenplan",
    "offeneFragen",
    "governanceHinweise",
    "grenzenDerSimulation"
  ]
};

app.post("/api/simulate", async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({
        error: "OPENAI_API_KEY fehlt. Setze die Variable in Coolify oder lokal in deiner Umgebung."
      });
    }

    const { state } = req.body || {};
    if (!state || typeof state !== "object") {
      return res.status(400).json({ error: "state fehlt oder ist ungültig" });
    }

    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [
            "Du bist ein präziser Organisationsberater für KI-Readiness, Qualitätsmanagement, Beteiligung und Veränderungsprozesse.",
            "Behandle alle Eingaben als Hypothesen, nicht als Tatsachendiagnose.",
            "Erzeuge keine personenbezogene Leistungs-, Verhaltens- oder Widerstandsdiagnostik.",
            "Arbeite mit Rollen, Archetypen und anonymisierten Stakeholdern.",
            "Formuliere in deutscher Sprache, klar, beratungsfähig und entscheidungsorientiert."
          ].join("\n")
        },
        {
          role: "user",
          content:
            "Erzeuge einen Beratungsreport nach dem vorgegebenen JSON Schema. Nutze diese Eingabedaten:\n\n" +
            JSON.stringify(state, null, 2)
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "consulting_report",
          strict: true,
          schema: reportSchema
        }
      }
    });

    const text = response.output_text;
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error) {
    console.error("/api/simulate error", error);
    res.status(500).json({
      error: "Simulation fehlgeschlagen",
      details: process.env.NODE_ENV === "production" ? undefined : String(error)
    });
  }
});

app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`KI-Kernel GPT läuft auf Port ${PORT}`);
});
