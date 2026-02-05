# PRD: A11y Autopilot — Voice + Command Palette Browser Extension (MVP v2)

## 0) Summary
A Chrome extension that overlays **any website** with:
- A **command palette** (keyboard-first)
- Optional **voice control**
- A universal **Action Map** of interactive elements so users can **click, focus, type, scroll** without precise mouse control

**New in v2:** **Live Voice Agent Mode** — continuous voice input that turns spoken instructions into a **multi-step action plan** and executes the flow hands-free (no keyboard/mouse).

---

## 1) Problem
Many websites remain hard to use for people with:
- Motor impairments (fine pointer control required, small click targets, hover menus)
- Low vision (dense layouts, insufficient contrast, unclear focus indicators)
- Cognitive load challenges (too many choices, inconsistent navigation)

A browser extension is ideal because it works across websites without requiring site owners to change code.

---

## 2) Goals
### G1 — Multimodal control (demo-reliable)
Users can open a palette and **type or speak** commands that execute actions on the current page.

### G2 — Hands-free flow automation (v2)
Users can enable **Live Voice Agent Mode** and complete multi-step flows using voice alone:
- “Click search, type cheap product, press enter, open the first result.”

### G3 — Measurable burden reduction
Show simple “before vs after” metrics:
- Time-to-complete a task
- Number of steps / commands
- Number of misclicks / retries / ambiguity prompts

### G4 — Low latency + graceful degradation
- Most commands resolved **locally**
- AI used only for **disambiguation** and **multi-step planning**
- If AI fails, fallback to local heuristics + quick numbered choice list

---

## 3) Non-goals (MVP scope boundaries)
- Full browser automation flows (Playwright-level)
- Guaranteed cross-origin iframe control (browser security limits this)
- Replacing screen readers
- Storing sensitive autofill profiles

---

## 4) Target users
Primary: People with motor impairments and/or mild low vision who benefit from:
- Reduced need for precise clicking
- Keyboard and voice-based interaction
- Clear highlighting and labeled interactive elements

---

## 5) Key user stories + acceptance criteria

### US1 — Command palette: click/open by text
**Story:** Press hotkey, type `click checkout`, extension clicks the correct element.  
**Acceptance:**
- Hotkey toggles palette on/off
- Executes click reliably on common sites
- If ambiguous, shows numbered list (1–9)
- Toast confirms action: “Clicked: Checkout”

### US2 — Voice control: scroll and basic actions
**Story:** Press mic button, say `scroll down`, page scrolls.  
**Acceptance:**
- Voice transcription appears in palette input
- Local-only commands run within ~300–800ms typical
- Voice can be disabled globally

### US3 — Label mode: “Open 7”
**Story:** Enable label mode, see big numbers on interactive elements, say/type `open 7`.  
**Acceptance:**
- Labels appear on visible interactive elements only
- `open N` clicks/focuses element N
- Overlay is reversible and does not permanently modify the page

### US4 — Type into a field
**Story:** Say/type `type john@example.com into email`, email field is filled.  
**Acceptance:**
- Supports `type <value> into <fieldHint>`
- Triggers proper DOM events (`input`, `change`) so modern frameworks update

### US5 — Live Voice Agent Mode (hands-free multi-step)
**Story:** Enable agent mode, speak a multi-step instruction, extension executes step-by-step.  
**Acceptance:**
- Supports at least **3 sequential actions** in one utterance
- Speaks back progress (“Searching… typing… opening results…”)
- If ambiguous, asks a question with 2–5 options
- Shows current step and last action in overlay

### US6 — Continuous scroll until stop
**Story:** Say “scroll down until I say stop”, it scrolls until user says “stop”.  
**Acceptance:**
- Scroll begins within 1 second
- Stops within 500ms of hearing “stop/cancel/pause”
- “Stop” button in overlay always halts execution immediately

### US7 — Explain this article/page
**Story:** Say “explain this article”, extension extracts main content, summarizes, reads it back.  
**Acceptance:**
- Extracts main text (prefer `<article>`; fallback to readability extraction)
- Produces summary: 3 bullet points + 1-paragraph overview
- Supports follow-up: “define <term> in this context” (optional stretch)

---

## 6) MVP command set
### Navigation
- `scroll down|up [amount]`
- `go back`
- `reload`
- `focus next`
- `focus previous`

### Actions
- `click <target>`
- `open <target>` (alias)
- `type <value> into <field>`
- `submit` (requires confirmation unless unambiguous)

### Label mode
- `label mode on`
- `label mode off`
- `open <number>`

### Agent mode (v2)
- `agent mode on`
- `agent mode off`
- `stop / cancel / pause` (global interrupt)

---

## 7) System architecture (Chrome MV3)
### Components
1) **Content script (in-page)**
- Injects overlay UI (Shadow DOM)
- Builds/updates the **Action Map**
- Executes actions (click/type/scroll/focus)
- Voice recognition (MVP: Web Speech API)
- Maintains agent state machine (v2)

2) **Background service worker (MV3)**
- Registers hotkeys (`chrome.commands`)
- Messaging to active tab to toggle palette and agent mode
- Stores settings (`chrome.storage`)

3) **Optional backend (recommended)**
- Calls LLM using secret API key
- Returns structured JSON: either a chosen element (disambiguation) or an action plan (agent mode)
- Prevents exposing keys in extension code

> Security note: Do not ship paid AI keys inside the extension.

---

## 8) Action Map (core data structure)
### Element types to include
- `button`, `a[href]`, `input`, `textarea`, `select`
- `[role="button"]`, `[role="link"]`, `[contenteditable="true"]`
- Optional: elements with `tabIndex >= 0` and visible

### Fields per element
```ts
type ActionElement = {
  id: string; // e.g., "el_000123"
  role: "button" | "link" | "input" | "textarea" | "select" | "other";
  label: string; // best-effort label
  bbox: { x: number; y: number; width: number; height: number };
  isVisible: boolean;
  selectorHint?: string; // optional best-effort
  nearbyText?: string;   // optional snippet for AI disambiguation/planning
};
```

### Label extraction priority
1) `aria-label`
2) `aria-labelledby`
3) `<label for=...>`
4) `placeholder`, `name`, `title`, `alt`
5) visible text (`innerText` / `textContent`)

### Updating strategy
- Build map when palette opens
- Refresh with `MutationObserver` (throttled) for SPAs

---

## 9) Agent Mode: state machine + execution loop (v2)

### Agent states
- `OFF`
- `LISTENING` (voice streaming active)
- `PLANNING` (converting transcript to action plan)
- `EXECUTING` (running steps)
- `NEED_CLARIFICATION` (awaiting user selection)
- `PAUSED` (stopped; can resume with “continue” — optional)

### Global interrupt
At any point, if transcript contains: `stop`, `cancel`, `pause`:
- set `interrupt=true`
- halt scrolling loop and pending execution
- speak “Stopped.”

### Streaming speech processing
- Keep a rolling transcript buffer.
- Trigger “plan” when:
  - user pauses for ~700–1200ms, OR
  - user says a delimiter phrase (e.g., “then”, “and then”), OR
  - manual “Run” command (optional)

---

## 10) Command resolution algorithm (rules first, AI second)

### Step A — Parse locally where possible
Local parser handles:
- scroll commands
- open number
- label mode toggles
- back/reload
- stop/cancel/pause

### Step B — Candidate scoring (local)
For CLICK / TYPE:
- Text similarity (`targetText` vs `label`)
- Role match boost
- Visibility boost
- Ignore tiny/offscreen/hidden elements

If top score ≥ threshold: execute locally.

### Step C — AI disambiguation and planning
Use AI when:
- multiple candidates are close, OR
- the user utterance describes a multi-step flow (agent mode)

---

## 11) AI integration spec

### Reality check
No AI provider gives a “control any website” SDK directly. You build control via DOM + heuristics. AI helps with:
- intent parsing
- multi-step planning
- element disambiguation
- summarization (“explain this article”)

### Speech-to-text options
- **MVP:** Chrome Web Speech API (`webkitSpeechRecognition`)
- **Higher accuracy option:** Azure Speech SDK
  - npm: https://www.npmjs.com/package/microsoft-cognitiveservices-speech-sdk

### LLM options (official TypeScript/JS SDKs)
Pick ONE for MVP:
- **OpenAI**: https://www.npmjs.com/package/openai
- **Anthropic (Claude)**: https://www.npmjs.com/package/@anthropic-ai/sdk
- **Google Gemini**: https://www.npmjs.com/package/@google/genai

### Backend endpoints (recommended)
#### A) Disambiguation
`POST /resolve`
- chooses one candidate element id

#### B) Agent planning (multi-step)
`POST /plan`
- returns an ordered list of actions to execute

Request:
```json
{
  "utterance": "Click search and enter cheap product, press enter",
  "url": "https://example.com",
  "mode": "AGENT",
  "candidates": [
    { "id": "el_12", "role": "button", "label": "Search", "nearbyText": "Header" },
    { "id": "el_44", "role": "input", "label": "Search", "nearbyText": "Search products" }
  ]
}
```

Response:
```json
{
  "actions": [
    { "kind": "CLICK", "target": { "by": "TEXT", "value": "Search" } },
    { "kind": "TYPE", "value": "cheap product", "fieldHint": "search" },
    { "kind": "PRESS_KEY", "key": "ENTER" }
  ],
  "needsClarification": false,
  "needsConfirmation": false
}
```

### Action schema (single source of truth)
```ts
type AgentAction =
  | { kind: "CLICK"; target: { by: "TEXT" | "NUMBER"; value: string | number } }
  | { kind: "TYPE"; value: string; fieldHint?: string }
  | { kind: "PRESS_KEY"; key: "ENTER" | "TAB" | "ESC" }
  | { kind: "SCROLL"; direction: "DOWN" | "UP"; mode: "ONCE" | "UNTIL"; until?: "STOP_WORD" | "FOUND_TEXT"; text?: string }
  | { kind: "FIND_TEXT"; text: string }
  | { kind: "READ_PAGE_SUMMARY"; scope: "VISIBLE" | "ARTICLE_MAIN" }
  | { kind: "ASK_CLARIFICATION"; question: string; options?: string[] }
  | { kind: "STOP" };
```

### Prompting rules (backend)
- JSON-only output
- For destructive actions (`delete`, `purchase`, `pay`, `submit`): set `needsConfirmation=true`
- Never send full HTML; send candidates + small extracted text only (for summarization, extracted article text is allowed but should be capped)

---

## 12) Explain this article/page (v2)
### Content extraction
Preferred:
1) `<article>` text
2) common blog containers (`main`, `#content`, `.post`, etc.)
3) Mozilla Readability extraction (recommended)

### Output formats (MVP)
- 1-paragraph overview
- 3–5 bullet points
- Key terms list (optional)
- TTS readback

---

## 13) UX requirements (agent mode)
- Overlay shows:
  - mic status (listening / off)
  - last transcript line
  - current step (e.g., “Step 2/4: Type ‘cheap product’”)
  - an always-visible **Stop** button
- Highlight elements before action
- When ambiguous: show 2–5 choices with large labels; user can answer by saying “option 2” or “the first one”

---

## 14) Settings (stored locally)
- Enable voice (default ON)
- Enable agent mode (default OFF)
- Confirm before dangerous actions (default ON)
- Backend URL (dev/prod)
- Demo mode metrics display (default ON)

---

## 15) Privacy and security
- Do not persist browsing history
- Do not send raw page content
- If AI enabled, send only candidate metadata required
- Summarization sends only extracted article text (capped) when needed
- Never embed paid API keys in extension package

---

## 16) Performance requirements
- Palette open: < 200ms typical after hotkey
- Local command execution: < 800ms typical
- AI round-trip: < 2.5s target; allow cancel; show progress state
- Stop command latency: < 500ms
- Stable after 30+ commands

---

## 17) Demo scenarios
### Scenario A — E-commerce search (hands-free)
“Click search and enter cheap product, press enter.”
“Open the first result.”
“Explain this article/page.”

### Scenario B — Article keyword navigation + continuous scroll
“Scroll down and find the word domain.”
“Scroll down until I say stop… stop.”

---

## 18) Deliverables
- Updated PRD (this file)
- Addendum doc (delta changes)
- Codex tasklist (implementation checklist)
