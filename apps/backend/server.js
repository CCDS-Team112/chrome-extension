import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { z } from "zod";

dotenv.config({ path: process.env.ENV_FILE || ".env.local" });

const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  next();
});
app.use(cors());
app.options("*", cors());
app.use(express.json({ limit: "200kb" }));

const LOG_LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase();
const LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);
const log = (level, message, meta) => {
  const normalized = LOG_LEVELS.has(level) ? level : "info";
  const allowed =
    LOG_LEVEL === "debug" ||
    (LOG_LEVEL === "info" && (normalized === "info" || normalized === "warn" || normalized === "error")) ||
    (LOG_LEVEL === "warn" && (normalized === "warn" || normalized === "error")) ||
    (LOG_LEVEL === "error" && normalized === "error");
  if (!allowed) return;
  const ts = new Date().toISOString();
  if (meta !== undefined) {
    console.log(`[${ts}] [${normalized}] ${message}`, meta);
  } else {
    console.log(`[${ts}] [${normalized}] ${message}`);
  }
};

app.use((req, res, next) => {
  const start = Date.now();
  const requestId = `req_${Math.random().toString(36).slice(2, 10)}`;
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  log("info", `[${requestId}] ${req.method} ${req.path}`);
  res.on("finish", () => {
    const ms = Date.now() - start;
    log("info", `[${requestId}] ${req.method} ${req.path} -> ${res.statusCode} ${ms}ms`);
  });
  next();
});

const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
if (!apiKey) {
  log("error", "Missing OPENAI_API_KEY (or OPENAI_KEY) environment variable.");
}

const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const ai = apiKey ? new OpenAI({ apiKey }) : null;

const SYSTEM_PROMPT = `
You are an accessibility assistant for a browser extension.
You receive a user command, the page URL, and a list of candidate elements.
Choose the single best candidate id for the command OR request confirmation if ambiguous.

Return JSON only, no markdown, using this schema:
{
  "chosenId": "el_00001" | null,
  "confidence": number, // 0..1
  "needsConfirmation": boolean,
  "reason": string
}
`;

const NORMALIZE_SYSTEM_PROMPT = `
You are an assistant that corrects speech-to-text errors for a browser command palette.
Return JSON only, no markdown, using this schema:
{
  "normalizedCommand": string,
  "confidence": number, // 0..1
  "reason": string
}

Rules:
- Do not invent actions that the user did not ask for.
- Only normalize to supported command patterns when possible.
- Use pageContext to disambiguate likely targets.
- If the utterance already looks valid, return it unchanged with high confidence.
- Prefer minimal edits (fix misheard words like "school" -> "scroll").
`;

const PLAN_SYSTEM_PROMPT = `
You are an accessibility agent that converts a user utterance into a short action plan.
Return JSON only, no markdown.
Use this schema:
{
  "actions": [
    { "kind": "CLICK", "target": { "by": "TEXT", "value": "Search" } },
    { "kind": "TYPE", "value": "cheap product", "fieldHint": "search" },
    { "kind": "PRESS_KEY", "key": "ENTER" }
  ],
  "needsClarification": false,
  "needsConfirmation": false
}
Only use these kinds: CLICK, TYPE, PRESS_KEY, SCROLL, READ_PAGE_SUMMARY, STOP.
SCROLL should be:
- {"kind":"SCROLL","direction":"DOWN","mode":"ONCE"}
- {"kind":"SCROLL","direction":"DOWN","mode":"UNTIL","until":"STOP_WORD"}
- {"kind":"SCROLL","direction":"DOWN","mode":"UNTIL","until":"FOUND_TEXT","text":"keyword"}
For destructive actions (submit, pay, purchase, delete), set needsConfirmation=true.
Use pageKeywords to choose better target labels when possible.
`;

const GUIDE_SYSTEM_PROMPT = `
You are an accessibility assistant that helps users navigate a web page.
Given a page URL and pageContext (headings, buttons, inputs, keywords), produce a very simple, short guide.

Return JSON only, no markdown, using this schema (max 6 items):
{
  "overview": string,
  "whatYouCanDo": string[]
}

Guidelines:
- Very simple language. Prefer clarity over accuracy if it gets complex.
- Only include the most important, useful tools/actions and their consequences.
- Format each whatYouCanDo item as: "Tool: purpose" (no starting verbs).
- Limit whatYouCanDo to at most 6 items.
`;

const ANSWER_SYSTEM_PROMPT = `
You answer user questions using only the provided page context and text.
If the answer is not present, say: "I couldn't find that on this page."
Return JSON only, no markdown, using this schema:
{
  "answer": string,
  "confidence": number // 0..1
}
Keep answers concise (1-4 sentences).
`;

const extractJson = (text) => {
  if (!text) return null;
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
};

const planSchema = z.object({
  actions: z.array(
    z.object({
      kind: z.enum(["CLICK", "TYPE", "PRESS_KEY", "SCROLL", "READ_PAGE_SUMMARY", "STOP"]),
      target: z
        .object({
          by: z.enum(["TEXT", "NUMBER"]),
          value: z.union([z.string(), z.number()]),
        })
        .optional(),
      value: z.string().optional(),
      fieldHint: z.string().optional(),
      key: z.enum(["ENTER", "TAB", "ESC"]).optional(),
      direction: z.enum(["DOWN", "UP"]).optional(),
      mode: z.enum(["ONCE", "UNTIL"]).optional(),
      until: z.enum(["STOP_WORD", "FOUND_TEXT"]).optional(),
      text: z.string().optional(),
      scope: z.enum(["ARTICLE_MAIN", "VISIBLE"]).optional(),
      amountPx: z.number().optional(),
    })
  ),
  needsClarification: z.boolean().optional(),
  needsConfirmation: z.boolean().optional(),
});

const resolveSchema = z.object({
  chosenId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  needsConfirmation: z.boolean(),
  reason: z.string(),
});

const summarySchema = z.object({
  overview: z.string(),
  bullets: z.array(z.string()).min(1).max(5),
  keyTerms: z.array(z.string()).optional(),
});

const guideSchema = z.object({
  overview: z.string(),
  whatYouCanDo: z.array(z.string()).min(1).max(6),
});

const normalizeSchema = z.object({
  normalizedCommand: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

const answerSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
});


app.post("/resolve", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "OPENAI_API_KEY (or OPENAI_KEY) not configured" });
  }
  const { command, url, candidates } = req.body || {};
  if (!command || !Array.isArray(candidates) || !candidates.length) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  log("debug", `[${req.requestId}] /resolve payload`, {
    commandLength: String(command).length,
    url: url || "",
    candidates: candidates.length,
  });

  const payload = {
    command,
    url,
    candidates: candidates.map((c) => ({
      id: c.id,
      role: c.role,
      label: c.label,
      nearbyText: c.nearbyText,
      selectorHint: c.selectorHint,
    })),
  };

  const userPrompt = `
Command: ${command}
URL: ${url || ""}
Candidates: ${JSON.stringify(payload.candidates)}
Choose the best candidate for the command.
If multiple candidates are plausible and you are not confident, set needsConfirmation=true.
`;

  try {
    log("debug", `[${req.requestId}] /resolve model`, { model: MODEL });
    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT.trim() },
        { role: "user", content: userPrompt.trim() },
      ],
      response_format: { type: "json_object" },
    });
    const text = response.choices?.[0]?.message?.content || "";
    const parsed = extractJson(text);
    if (!parsed) {
      log("warn", `[${req.requestId}] /resolve parse failed`);
      return res.status(200).json({
        chosenId: null,
        confidence: 0,
        needsConfirmation: true,
        reason: "Could not parse model response",
      });
    }
    const validated = resolveSchema.safeParse(parsed);
    if (!validated.success) {
      log("warn", `[${req.requestId}] /resolve schema invalid`, validated.error?.issues);
      return res.status(200).json({
        chosenId: null,
        confidence: 0,
        needsConfirmation: true,
        reason: "Invalid model response",
      });
    }
    log("debug", `[${req.requestId}] /resolve result`, {
      chosenId: validated.data.chosenId,
      confidence: validated.data.confidence,
      needsConfirmation: validated.data.needsConfirmation,
    });
    return res.json(validated.data);
  } catch (err) {
    log("error", `[${req.requestId}] /resolve model error`, err?.message || err);
    return res.status(500).json({ error: "Model call failed" });
  }
});

app.post("/normalize", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "OPENAI_API_KEY (or OPENAI_KEY) not configured" });
  }
  const { utterance, url, pageContext, commandHints } = req.body || {};
  if (!utterance || typeof utterance !== "string") {
    return res.status(400).json({ error: "Invalid payload" });
  }
  log("debug", `[${req.requestId}] /normalize payload`, {
    utteranceLength: utterance.length,
    url: url || "",
    commandHints: Array.isArray(commandHints) ? commandHints.length : 0,
  });
  const payload = {
    utterance,
    url: url || "",
    pageContext: pageContext || {},
    commandHints: Array.isArray(commandHints) ? commandHints : [],
  };
  const userPrompt = `
Utterance: ${payload.utterance}
URL: ${payload.url}
CommandHints: ${JSON.stringify(payload.commandHints)}
PageContext: ${JSON.stringify(payload.pageContext)}
Normalize the utterance into a valid command if needed.
`;
  try {
    log("debug", `[${req.requestId}] /normalize model`, { model: MODEL });
    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: NORMALIZE_SYSTEM_PROMPT.trim() },
        { role: "user", content: userPrompt.trim() },
      ],
      response_format: { type: "json_object" },
    });
    const text = response.choices?.[0]?.message?.content || "";
    const parsed = extractJson(text);
    if (!parsed) {
      log("warn", `[${req.requestId}] /normalize parse failed`);
      return res.status(200).json({
        normalizedCommand: utterance,
        confidence: 0,
        reason: "Could not parse model response",
      });
    }
    const validated = normalizeSchema.safeParse(parsed);
    if (!validated.success) {
      log("warn", `[${req.requestId}] /normalize schema invalid`, validated.error?.issues);
      return res.status(200).json({
        normalizedCommand: utterance,
        confidence: 0,
        reason: "Invalid model response",
      });
    }
    log("debug", `[${req.requestId}] /normalize result`, {
      normalizedCommand: validated.data.normalizedCommand,
      confidence: validated.data.confidence,
    });
    return res.json(validated.data);
  } catch (err) {
    log("error", `[${req.requestId}] /normalize model error`, err?.message || err);
    return res.status(500).json({ error: "Model call failed" });
  }
});

app.post("/plan", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "OPENAI_API_KEY (or OPENAI_KEY) not configured" });
  }
  const { utterance, url, candidates, pageKeywords } = req.body || {};
  if (!utterance || !Array.isArray(candidates)) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  log("debug", `[${req.requestId}] /plan payload`, {
    utteranceLength: utterance.length,
    url: url || "",
    candidates: candidates.length,
    pageKeywords: Array.isArray(pageKeywords) ? pageKeywords.length : 0,
  });

  const payload = {
    utterance,
    url,
    candidates: candidates.map((c) => ({
      id: c.id,
      role: c.role,
      label: c.label,
      nearbyText: c.nearbyText,
      selectorHint: c.selectorHint,
    })),
    pageKeywords: Array.isArray(pageKeywords) ? pageKeywords.slice(0, 40) : [],
  };

  const userPrompt = `
Utterance: ${utterance}
URL: ${url || ""}
Candidates: ${JSON.stringify(payload.candidates)}
PageKeywords: ${JSON.stringify(payload.pageKeywords)}
Return a short ordered action plan. Avoid extra steps.
`;

  try {
    log("debug", `[${req.requestId}] /plan model`, { model: MODEL });
    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: PLAN_SYSTEM_PROMPT.trim() },
        { role: "user", content: userPrompt.trim() },
      ],
      response_format: { type: "json_object" },
    });
    const text = response.choices?.[0]?.message?.content || "";
    const parsed = extractJson(text);
    if (!parsed) {
      log("warn", `[${req.requestId}] /plan parse failed`);
      return res.status(200).json({
        actions: [],
        needsClarification: true,
        needsConfirmation: false,
      });
    }
    const validated = planSchema.safeParse(parsed);
    if (!validated.success) {
      log("warn", `[${req.requestId}] /plan schema invalid`, validated.error?.issues);
      return res.status(200).json({
        actions: [],
        needsClarification: true,
        needsConfirmation: false,
      });
    }
    log("debug", `[${req.requestId}] /plan result`, {
      actions: validated.data.actions?.length || 0,
      needsClarification: validated.data.needsClarification === true,
      needsConfirmation: validated.data.needsConfirmation === true,
    });
    return res.json(validated.data);
  } catch (err) {
    log("error", `[${req.requestId}] /plan model error`, err?.message || err);
    return res.status(500).json({ error: "Model call failed" });
  }
});

app.post("/guide", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "OPENAI_API_KEY (or OPENAI_KEY) not configured" });
  }
  const { url, pageContext } = req.body || {};
  if (!pageContext || typeof pageContext !== "object") {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const payload = {
    url: url || "",
    pageContext,
  };
  const userPrompt = `
URL: ${payload.url}
PageContext: ${JSON.stringify(payload.pageContext)}
Provide a short navigation guide for this page.
`;
  try {
    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: GUIDE_SYSTEM_PROMPT.trim() },
        { role: "user", content: userPrompt.trim() },
      ],
      response_format: { type: "json_object" },
    });
    const text = response.choices?.[0]?.message?.content || "";
    const parsed = extractJson(text);
    if (!parsed) {
      return res.status(200).json({
        overview: "Guide unavailable.",
        whatYouCanDo: [],
      });
    }
    if (Array.isArray(parsed.whatYouCanDo)) {
      parsed.whatYouCanDo = parsed.whatYouCanDo.slice(0, 6);
    }
    const validated = guideSchema.safeParse(parsed);
    if (!validated.success) {
      return res.status(200).json({
        overview: "Guide unavailable.",
        whatYouCanDo: [],
      });
    }
    return res.json(validated.data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Model call failed" });
  }
});

app.post("/summarize", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "OPENAI_API_KEY (or OPENAI_KEY) not configured" });
  }
  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Invalid payload" });
  }
  log("debug", `[${req.requestId}] /summarize payload`, {
    textLength: text.length,
    textPreview: text.slice(0, 120),
  });
  const prompt = `
Summarize the following article text.
Return JSON only with:
{
  "overview": "1 paragraph",
  "bullets": ["3-5 bullets"],
  "keyTerms": ["optional terms"]
}
Text:
${text.slice(0, 6000)}
`;
  try {
    log("debug", `[${req.requestId}] /summarize model`, { model: MODEL });
    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt.trim() }],
      response_format: { type: "json_object" },
    });
    log("debug", `[${req.requestId}] /summarize openai response meta`, {
      id: response?.id,
      model: response?.model,
      usage: response?.usage,
    });
    const parsed = extractJson(response.choices?.[0]?.message?.content || "");
    if (!parsed) {
      log("warn", `[${req.requestId}] /summarize parse failed`);
      return res.status(200).json({
        overview: "Summary unavailable.",
        bullets: [],
        keyTerms: [],
      });
    }
    const validated = summarySchema.safeParse(parsed);
    if (!validated.success) {
      log("warn", `[${req.requestId}] /summarize schema invalid`, validated.error?.issues);
      return res.status(200).json({
        overview: "Summary unavailable.",
        bullets: [],
        keyTerms: [],
      });
    }
    log("debug", `[${req.requestId}] /summarize result`, {
      bullets: validated.data.bullets?.length || 0,
      keyTerms: validated.data.keyTerms?.length || 0,
    });
    return res.json(validated.data);
  } catch (err) {
    log("error", `[${req.requestId}] /summarize model error`, {
      message: err?.message || String(err),
      name: err?.name,
      code: err?.code,
      status: err?.status,
      type: err?.type,
      stack: err?.stack,
    });
    if (err?.response) {
      log("error", `[${req.requestId}] /summarize model error response`, {
        status: err.response.status,
        headers: err.response.headers,
        body: err.response.data || err.response.body,
      });
    }
    return res.status(500).json({ error: "Model call failed" });
  }
});

app.post("/answer", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "OPENAI_API_KEY (or OPENAI_KEY) not configured" });
  }
  const { question, url, pageContext, text } = req.body || {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Invalid payload" });
  }
  log("debug", `[${req.requestId}] /answer payload`, {
    questionLength: question.length,
    url: url || "",
    pageContextKeys: pageContext ? Object.keys(pageContext) : [],
    textLength: typeof text === "string" ? text.length : 0,
  });

  const prompt = `
Question: ${question}
URL: ${url || ""}
PageContext: ${JSON.stringify(pageContext || {})}
PageText: ${(text || "").slice(0, 6000)}
Answer using only the provided context.
`;

  try {
    log("debug", `[${req.requestId}] /answer model`, { model: MODEL });
    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: ANSWER_SYSTEM_PROMPT.trim() },
        { role: "user", content: prompt.trim() },
      ],
      response_format: { type: "json_object" },
    });
    log("debug", `[${req.requestId}] /answer openai response meta`, {
      id: response?.id,
      model: response?.model,
      usage: response?.usage,
    });
    const parsed = extractJson(response.choices?.[0]?.message?.content || "");
    if (!parsed) {
      log("warn", `[${req.requestId}] /answer parse failed`);
      return res.status(200).json({
        answer: "I couldn't find that on this page.",
        confidence: 0,
      });
    }
    const validated = answerSchema.safeParse(parsed);
    if (!validated.success) {
      log("warn", `[${req.requestId}] /answer schema invalid`, validated.error?.issues);
      return res.status(200).json({
        answer: "I couldn't find that on this page.",
        confidence: 0,
      });
    }
    log("debug", `[${req.requestId}] /answer result`, {
      confidence: validated.data.confidence,
      answerLength: validated.data.answer.length,
    });
    return res.json(validated.data);
  } catch (err) {
    log("error", `[${req.requestId}] /answer model error`, {
      message: err?.message || String(err),
      name: err?.name,
      code: err?.code,
      status: err?.status,
      type: err?.type,
      stack: err?.stack,
    });
    if (err?.response) {
      log("error", `[${req.requestId}] /answer model error response`, {
        status: err.response.status,
        headers: err.response.headers,
        body: err.response.data || err.response.body,
      });
    }
    return res.status(500).json({ error: "Model call failed" });
  }
});


const port = process.env.PORT || 8787;
app.listen(port, () => {
  log("info", `A11y Autopilot backend listening on http://localhost:${port}`);
});
