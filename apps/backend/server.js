import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY environment variable.");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

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


app.post("/resolve", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }
  const { command, url, candidates } = req.body || {};
  if (!command || !Array.isArray(candidates) || !candidates.length) {
    return res.status(400).json({ error: "Invalid payload" });
  }

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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT.trim() + "\n" + userPrompt.trim() }] },
      ],
      generationConfig: { temperature: 0.2 },
    });
    const text = response.text || "";
    const parsed = extractJson(text);
    if (!parsed) {
      return res.status(200).json({
        chosenId: null,
        confidence: 0,
        needsConfirmation: true,
        reason: "Could not parse model response",
      });
    }
    const validated = resolveSchema.safeParse(parsed);
    if (!validated.success) {
      return res.status(200).json({
        chosenId: null,
        confidence: 0,
        needsConfirmation: true,
        reason: "Invalid model response",
      });
    }
    return res.json(validated.data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Model call failed" });
  }
});

app.post("/plan", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }
  const { utterance, url, candidates, pageKeywords } = req.body || {};
  if (!utterance || !Array.isArray(candidates)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: PLAN_SYSTEM_PROMPT.trim() + "\n" + userPrompt.trim() }] },
      ],
      generationConfig: { temperature: 0.2 },
    });
    const text = response.text || "";
    const parsed = extractJson(text);
    if (!parsed) {
      return res.status(200).json({
        actions: [],
        needsClarification: true,
        needsConfirmation: false,
      });
    }
    const validated = planSchema.safeParse(parsed);
    if (!validated.success) {
      return res.status(200).json({
        actions: [],
        needsClarification: true,
        needsConfirmation: false,
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
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }
  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Invalid payload" });
  }
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt.trim() }] }],
      generationConfig: { temperature: 0.2 },
    });
    const parsed = extractJson(response.text || "");
    if (!parsed) {
      return res.status(200).json({
        overview: "Summary unavailable.",
        bullets: [],
        keyTerms: [],
      });
    }
    const validated = summarySchema.safeParse(parsed);
    if (!validated.success) {
      return res.status(200).json({
        overview: "Summary unavailable.",
        bullets: [],
        keyTerms: [],
      });
    }
    return res.json(validated.data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Model call failed" });
  }
});


const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`A11y Autopilot backend listening on http://localhost:${port}`);
});
