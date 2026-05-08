import mammoth from "mammoth";
import pdfParse from "pdf-parse";

function fileExtension(name = "") {
  return name.toLowerCase().split(".").pop() || "";
}

export async function extractDocumentHandler(req, res) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Keine Datei übermittelt." });
    const ext = fileExtension(file.originalname);
    let text = "";
    if (["txt", "md", "json"].includes(ext) || file.mimetype?.startsWith("text/")) {
      text = file.buffer.toString("utf8");
    } else if (ext === "docx" || file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      text = (await mammoth.extractRawText({ buffer: file.buffer })).value || "";
    } else if (ext === "pdf" || file.mimetype === "application/pdf") {
      text = (await pdfParse(file.buffer)).text || "";
    } else {
      return res.status(400).json({ error: "Dateityp nicht unterstützt. Unterstützt: TXT, MD, JSON, DOCX, PDF." });
    }
    const clean = text
      .replace(/\u0000/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
    if (!clean) {
      return res.status(422).json({ error: "Es konnte kein Text extrahiert werden. Bei gescannten PDFs ist OCR nötig; das ist noch nicht aktiviert." });
    }
    res.json({
      filename: file.originalname,
      mimeType: file.mimetype,
      bytes: file.size,
      characters: clean.length,
      text: clean.slice(0, 120000),
      truncated: clean.length > 120000
    });
  } catch (error) {
    res.status(500).json({
      error: "Dokumentextraktion fehlgeschlagen",
      details: process.env.NODE_ENV === "production" ? undefined : String(error)
    });
  }
}

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
  required: [
    "Executive Summary",
    "Ausgangslage",
    "Simulationsannahmen",
    "Persona- und Stakeholderanalyse",
    "Ressourcen- und Risikolage",
    "Phasenanalyse",
    "Konflikt- und Koalitionsmuster",
    "Kritische Kipppunkte",
    "Interventionsoptionen",
    "Entscheidungsmatrix",
    "Maßnahmenplan",
    "Offene Fragen",
    "Datenschutz-/Governance-Hinweise",
    "Grenzen der Simulation"
  ]
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
    assumptions: { type: "array", items: { type: "object", additionalProperties: true } },
    personas: { type: "array", items: { type: "object", additionalProperties: true } },
    resources: { type: "array", items: { type: "object", additionalProperties: true } },
    interventions: { type: "array", items: { type: "object", additionalProperties: true } },
    strategies: { type: "array", items: { type: "object", additionalProperties: true } },
    openQuestions: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } }
  },
  required: ["context", "assumptions", "personas", "resources", "interventions", "strategies", "openQuestions", "warnings"]
};

class OpenAIJsonParseError extends Error {
  constructor(message = "OpenAI-Antwort konnte nicht als JSON verarbeitet werden.") {
    super(message);
    this.name = "OpenAIJsonParseError";
    this.statusCode = 502;
    this.publicMessage = "Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuche es erneut.";
  }
}

function parseOpenAIJsonResponse(response, context) {
  const raw = response?.output_text;

  if (typeof raw !== "string" || !raw.trim()) {
    console.error(`[openai-routes] ${context}: OpenAI response has no output_text`, {
      outputTextType: typeof raw
    });
    throw new OpenAIJsonParseError("OpenAI response output_text is missing or empty.");
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[openai-routes] ${context}: malformed OpenAI JSON response`, {
      message: error?.message,
      outputPreview: raw.slice(0, 1000)
    });
    throw new OpenAIJsonParseError();
  }
}

function sendOpenAIError(res, error, fallbackMessage) {
  const statusCode = error instanceof OpenAIJsonParseError ? error.statusCode : 500;
  const publicMessage = error instanceof OpenAIJsonParseError ? error.publicMessage : fallbackMessage;

  if (!(error instanceof OpenAIJsonParseError)) {
    console.error("[openai-routes] OpenAI route failed", {
      name: error?.name,
      message: error?.message
    });
  }

  return res.status(statusCode).json({ error: publicMessage });
}

function requireOpenAI(openai, res) {
  if (!openai) {
    res.status(500).json({ error: "OPENAI_API_KEY fehlt. Setze die Variable in Coolify oder lokal in deiner Umgebung." });
    return false;
  }
  return true;
}

export async function importScenarioHandler(req, res, openai, model) {
  try {
    if (!requireOpenAI(openai, res)) return;
    const { text, documentType = "Konzept", analysisMode = "beratend" } = req.body || {};
    if (!text || typeof text !== "string" || text.trim().length < 80) {
      return res.status(400).json({ error: "Bitte füge einen längeren Konzepttext ein." });
    }
    if (text.length > 45000) {
      return res.status(400).json({ error: "Der Text ist zu lang. Bitte kürzen oder in Abschnitten analysieren." });
    }
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content: "Du bist ein präziser Organisationsberater und Szenarioarchitekt. Erzeuge aus dem Dokument einen prüfbaren Szenarioentwurf, keine Diagnose. Arbeite nur mit Rollen, Archetypen und anonymisierten Stakeholdern. Formuliere auf Deutsch."
        },
        {
          role: "user",
          content: `Dokumenttyp: ${documentType}\nAnalysemodus: ${analysisMode}\n\nErzeuge einen Szenarioentwurf nach dem JSON Schema.\n\nDokument:\n${text}`
        }
      ],
      text: { format: { type: "json_schema", name: "scenario_draft", strict: true, schema: scenarioSchema } }
    });
    res.json(parseOpenAIJsonResponse(response, "importScenarioHandler"));
  } catch (error) {
    return sendOpenAIError(res, error, "Szenarioimport fehlgeschlagen");
  }
}

export async function simulateHandler(req, res, openai, model) {
  try {
    if (!requireOpenAI(openai, res)) return;
    const { state } = req.body || {};
    if (!state || typeof state !== "object") {
      return res.status(400).json({ error: "state fehlt oder ist ungültig" });
    }
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content: "Du bist ein präziser Organisationsberater. Behandle alle Eingaben als Hypothesen, nicht als Tatsachendiagnose. Nutze exakt die vorgegebenen deutschen Abschnittsüberschriften."
        },
        {
          role: "user",
          content: "Erzeuge einen Beratungsreport nach dem vorgegebenen JSON Schema. Nutze diese Eingabedaten:\n\n" + JSON.stringify(state, null, 2)
        }
      ],
      text: { format: { type: "json_schema", name: "consulting_report", strict: true, schema: reportSchema } }
    });
    res.json(parseOpenAIJsonResponse(response, "simulateHandler"));
  } catch (error) {
    return sendOpenAIError(res, error, "Simulation fehlgeschlagen");
  }
}
