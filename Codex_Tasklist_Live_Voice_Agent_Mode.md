# Codex Tasklist: Add Live Voice Agent Mode to Existing Extension

> Goal: Add **hands-free live voice** that converts streaming speech into a **multi-step action plan** and executes flows without keyboard/mouse.

## A) Extension UI + Controls
- [ ] Add “Agent Mode” toggle in overlay UI (and/or hotkey)
- [ ] Add mic status indicator (Listening / Off)
- [ ] Add transcript preview line (last recognized phrase)
- [ ] Add step tracker: `Step i/n` + current action label
- [ ] Add always-visible **Stop** button

## B) Voice Streaming (MVP)
- [ ] Implement Web Speech API (`webkitSpeechRecognition`) streaming
- [ ] Maintain rolling transcript buffer
- [ ] Detect pause (700–1200ms) to trigger planning
- [ ] Detect stop words (“stop”, “cancel”, “pause”) instantly

## C) Agent State Machine
- [ ] Implement agent states: OFF, LISTENING, PLANNING, EXECUTING, NEED_CLARIFICATION
- [ ] Global interrupt flag that halts EXECUTING immediately
- [ ] When interrupted: cancel scroll loops + pending actions

## D) Action Plan + Execution Engine
- [ ] Define `AgentAction` TS type (single source of truth)
- [ ] Implement executor for:
  - [ ] CLICK (by TEXT or NUMBER)
  - [ ] TYPE (with optional fieldHint)
  - [ ] PRESS_KEY (ENTER/TAB/ESC)
  - [ ] SCROLL (ONCE)
  - [ ] SCROLL (UNTIL STOP_WORD)
  - [ ] FIND_TEXT (highlight match and stop)
  - [ ] READ_PAGE_SUMMARY (ARTICLE_MAIN)
- [ ] Implement “highlight before act” overlay feedback

## E) Action Map Integration
- [ ] Ensure Action Map is refreshed before planning/executing (SPA-safe)
- [ ] Candidate resolution via local scoring:
  - label similarity
  - role match
  - visibility
- [ ] Ambiguity UI:
  - [ ] display top 2–5 options
  - [ ] accept voice “option 2” and click accordingly

## F) Backend: Planning and Disambiguation
- [ ] Add endpoint `POST /plan`:
  - input: utterance, url, candidates summary
  - output: JSON-only `{ actions[], needsClarification, needsConfirmation }`
- [ ] Extend or reuse `POST /resolve` for single-step disambiguation
- [ ] Add JSON schema validation (e.g., Zod) to reject malformed responses

## G) Summarization: “Explain this article”
- [ ] Extract article text:
  - [ ] prefer `<article>`
  - [ ] fallback: Mozilla Readability (recommended)
- [ ] Send extracted text (capped) to backend summarizer call
- [ ] Render summary in overlay + speak via `speechSynthesis`

## H) Safety
- [ ] Add “confirm dangerous actions” gate
- [ ] Dangerous intents: submit/purchase/pay/delete
- [ ] If dangerous: ask “Do you want me to proceed?” and wait for “yes/no”

## I) Test Commands (for manual QA)
### Intermediate
- “Click search and enter cheap product, press enter.”
- “Scroll down and find the keyword domain.”
- “Scroll down until I say stop… stop.”
- “Type john@example.com into email.”

### Complex
- “Explain this article.”
- “Summarize the main argument in 3 points.”
- “Define domain as used in this article.”

## J) Demo Script (2 minutes)
1) Enable Agent Mode
2) “Click search and enter cheap product, press enter.”
3) “Open the first result.”
4) “Explain this article.”
5) “Scroll down until I say stop… stop.”
