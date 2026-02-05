const A11Y_STATE = {
  paletteOpen: false,
  labelMode: false,
  actionMap: [],
  actionElementsById: new Map(),
  labelMap: new Map(),
  ambiguousCandidates: [],
  metrics: {
    sessionStart: 0,
    steps: 0,
    ambiguity: 0,
  },
  settings: {
    voiceEnabled: true,
    agentModeEnabled: false,
    confirmDanger: true,
    demoMetrics: true,
    backendUrl: "",
  },
  agent: {
    enabled: false,
    state: "OFF",
    transcript: "",
    lastUtterance: "",
    plan: [],
    stepIndex: 0,
    interrupt: false,
    scrollTimer: null,
    pauseTimer: null,
    pendingContinuation: null,
    lastElement: null,
    clarification: null,
    confirmation: null,
    currentActionLabel: "",
  },
  recognition: null,
  observer: null,
  observerTimer: null,
  labelTimer: null,
  root: null,
  shadow: null,
  inputEl: null,
  listEl: null,
  hintEl: null,
  metricsEl: null,
  toastEl: null,
  labelsEl: null,
  micBtn: null,
  agentToggleBtn: null,
  agentStatusEl: null,
  agentTranscriptEl: null,
  agentStepEl: null,
  agentStopBtn: null,
  paletteEl: null,
  dragHandleEl: null,
  drag: {
    active: false,
    offsetX: 0,
    offsetY: 0,
  },
};

const DEFAULT_SETTINGS = {
  voiceEnabled: true,
  agentModeEnabled: false,
  confirmDanger: true,
  demoMetrics: true,
  backendUrl: "",
};

const DANGEROUS_KEYWORDS = ["delete", "remove", "pay", "submit", "purchase"];
const STOP_WORDS = ["stop", "cancel", "pause"];
const OPTION_WORDS = {
  "first": 1,
  "first one": 1,
  "one": 1,
  "1": 1,
  "second": 2,
  "second one": 2,
  "two": 2,
  "2": 2,
  "third": 3,
  "third one": 3,
  "three": 3,
  "3": 3,
  "fourth": 4,
  "four": 4,
  "4": 4,
  "fifth": 5,
  "five": 5,
  "5": 5,
};

const AGENT_ACTION_KINDS = ["CLICK", "TYPE", "PRESS_KEY", "SCROLL", "READ_PAGE_SUMMARY", "STOP"];
const SCROLL_MODES = ["ONCE", "UNTIL"];
const SCROLL_UNTIL = ["STOP_WORD", "FOUND_TEXT"];
const PRESS_KEYS = ["ENTER", "TAB", "ESC"];

const ACTION_SELECTORS = [
  "button",
  "a[href]",
  "input",
  "textarea",
  "select",
  "[role='button']",
  "[role='link']",
  "[contenteditable='true']",
  "[tabindex]",
];

const ensureUi = () => {
  if (A11Y_STATE.root) return;
  const host = document.createElement("div");
  host.id = "a11y-autopilot-root";
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    #wrap {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      pointer-events: none;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif;
    }
    .palette {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      width: min(680px, 92vw);
      background: #0b0f14;
      color: #f5f7fa;
      border: 2px solid #2f80ed;
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.35);
      padding: 12px;
      display: none;
      pointer-events: auto;
    }
    .palette.dragging {
      cursor: grabbing;
      user-select: none;
    }
    .drag-handle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #94a3b8;
      cursor: grab;
      margin-bottom: 6px;
    }
    .drag-handle::before {
      content: "⋮⋮";
      letter-spacing: 2px;
      font-size: 14px;
    }
    .row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .cmd-input {
      flex: 1;
      font-size: 16px;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #4b5563;
      background: #111827;
      color: #f9fafb;
      outline: none;
    }
    .cmd-input:focus {
      border-color: #93c5fd;
      box-shadow: 0 0 0 2px rgba(147,197,253,0.35);
    }
    .mic-btn {
      min-width: 44px;
      height: 40px;
      border-radius: 8px;
      border: 1px solid #4b5563;
      background: #111827;
      color: #f9fafb;
      cursor: pointer;
    }
    .mic-btn.active {
      border-color: #22c55e;
      box-shadow: 0 0 0 2px rgba(34,197,94,0.35);
    }
    .hint {
      margin-top: 8px;
      font-size: 12px;
      color: #cbd5e1;
    }
    .list {
      margin-top: 10px;
      display: grid;
      gap: 6px;
    }
    .list-item {
      background: #111827;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 14px;
      cursor: pointer;
    }
    .list-item ul {
      margin: 6px 0 0 18px;
      padding: 0;
    }
    .list-item strong { color: #93c5fd; }
    .metrics {
      margin-top: 8px;
      font-size: 12px;
      color: #cbd5e1;
      display: none;
    }
    .toast {
      position: fixed;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      background: #111827;
      color: #f9fafb;
      border: 1px solid #374151;
      padding: 8px 12px;
      border-radius: 8px;
      display: none;
      pointer-events: none;
    }
    .labels {
      position: fixed;
      inset: 0;
      pointer-events: none;
    }
    .label-chip {
      position: absolute;
      background: #fde047;
      color: #0b0f14;
      border: 2px solid #0b0f14;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      padding: 2px 6px;
      transform: translate(-2px, -2px);
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    }
    .confirm-row {
      margin-top: 10px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .confirm-btn {
      border: 1px solid #ef4444;
      background: #7f1d1d;
      color: #fef2f2;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    .cancel-btn {
      border: 1px solid #64748b;
      background: #0f172a;
      color: #e2e8f0;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    .agent-panel {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid #334155;
      border-radius: 10px;
      background: #0f172a;
      display: none;
    }
    .agent-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
      color: #cbd5e1;
    }
    .agent-toggle {
      border: 1px solid #334155;
      background: #111827;
      color: #e2e8f0;
      padding: 4px 8px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
    }
    .agent-toggle.active {
      border-color: #22c55e;
      box-shadow: 0 0 0 2px rgba(34,197,94,0.25);
    }
    .agent-stop {
      border: 1px solid #ef4444;
      background: #7f1d1d;
      color: #fef2f2;
      padding: 4px 8px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
    }
    .agent-line {
      margin-top: 6px;
      font-size: 12px;
      color: #93c5fd;
    }
  `;

  shadow.innerHTML = `
    <div id="wrap">
      <div class="palette" role="dialog" aria-modal="true" aria-label="A11y Autopilot">
        <div class="drag-handle">Drag</div>
        <div class="row">
          <input class="cmd-input" type="text" placeholder="Type a command..." />
          <button class="mic-btn" title="Voice input">Mic</button>
        </div>
        <div class="hint">Try: click checkout, scroll down, label mode on, open 3</div>
        <div class="list"></div>
        <div class="agent-panel">
          <div class="agent-row">
            <div>
              <strong>Agent</strong>
              <span class="agent-status">OFF</span>
            </div>
            <div class="agent-controls">
              <button class="agent-toggle">Agent Mode</button>
              <button class="agent-stop">Stop</button>
            </div>
          </div>
          <div class="agent-line agent-transcript">Transcript: —</div>
          <div class="agent-line agent-step">Step: —</div>
        </div>
        <div class="metrics"></div>
      </div>
      <div class="labels"></div>
      <div class="toast"></div>
    </div>
  `;

  shadow.appendChild(style);
  document.documentElement.appendChild(host);

  A11Y_STATE.root = host;
  A11Y_STATE.shadow = shadow;
  A11Y_STATE.inputEl = shadow.querySelector(".cmd-input");
  A11Y_STATE.listEl = shadow.querySelector(".list");
  A11Y_STATE.hintEl = shadow.querySelector(".hint");
  A11Y_STATE.metricsEl = shadow.querySelector(".metrics");
  A11Y_STATE.toastEl = shadow.querySelector(".toast");
  A11Y_STATE.labelsEl = shadow.querySelector(".labels");
  A11Y_STATE.micBtn = shadow.querySelector(".mic-btn");
  A11Y_STATE.paletteEl = shadow.querySelector(".palette");
  A11Y_STATE.agentToggleBtn = shadow.querySelector(".agent-toggle");
  A11Y_STATE.agentStatusEl = shadow.querySelector(".agent-status");
  A11Y_STATE.agentTranscriptEl = shadow.querySelector(".agent-transcript");
  A11Y_STATE.agentStepEl = shadow.querySelector(".agent-step");
  A11Y_STATE.agentStopBtn = shadow.querySelector(".agent-stop");

  A11Y_STATE.inputEl.addEventListener("keydown", onInputKeyDown);
  A11Y_STATE.micBtn.addEventListener("click", toggleVoice);
  A11Y_STATE.agentToggleBtn.addEventListener("click", toggleAgentMode);
  A11Y_STATE.agentStopBtn.addEventListener("click", interruptAgent);
  A11Y_STATE.paletteEl.addEventListener("mousedown", startDrag);
};

const loadSettings = async () => {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  A11Y_STATE.settings = { ...DEFAULT_SETTINGS, ...stored };
};

const showPalette = async () => {
  ensureUi();
  await loadSettings();
  A11Y_STATE.paletteOpen = true;
  A11Y_STATE.shadow.querySelector(".palette").style.display = "block";
  A11Y_STATE.shadow.querySelector(".agent-panel").style.display =
    A11Y_STATE.settings.agentModeEnabled ? "block" : "none";
  A11Y_STATE.agent.enabled = A11Y_STATE.settings.agentModeEnabled;
  updateAgentUi();
  A11Y_STATE.inputEl.value = "";
  A11Y_STATE.inputEl.focus();
  A11Y_STATE.metrics.sessionStart = Date.now();
  A11Y_STATE.metrics.steps = 0;
  A11Y_STATE.metrics.ambiguity = 0;
  updateMetrics();
  clearList();
  buildActionMap();
  startObserver();
};

const hidePalette = () => {
  if (!A11Y_STATE.shadow) return;
  A11Y_STATE.paletteOpen = false;
  A11Y_STATE.shadow.querySelector(".palette").style.display = "none";
  clearList();
  stopObserver();
  stopVoice();
  stopAgent();
};

const togglePalette = async () => {
  if (!A11Y_STATE.paletteOpen) {
    await showPalette();
  } else {
    hidePalette();
  }
};

const startDrag = (e) => {
  if (!A11Y_STATE.paletteEl) return;
  const target = e.target;
  if (target && target.closest("input, button, textarea, select")) return;
  e.preventDefault();
  const rect = A11Y_STATE.paletteEl.getBoundingClientRect();
  A11Y_STATE.drag.active = true;
  A11Y_STATE.drag.offsetX = e.clientX - rect.left;
  A11Y_STATE.drag.offsetY = e.clientY - rect.top;
  A11Y_STATE.paletteEl.classList.add("dragging");
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", endDrag, { once: true });
};

const onDragMove = (e) => {
  if (!A11Y_STATE.drag.active || !A11Y_STATE.paletteEl) return;
  const maxX = window.innerWidth - A11Y_STATE.paletteEl.offsetWidth;
  const maxY = window.innerHeight - A11Y_STATE.paletteEl.offsetHeight;
  const nextX = Math.min(Math.max(0, e.clientX - A11Y_STATE.drag.offsetX), maxX);
  const nextY = Math.min(Math.max(0, e.clientY - A11Y_STATE.drag.offsetY), maxY);
  A11Y_STATE.paletteEl.style.left = `${nextX}px`;
  A11Y_STATE.paletteEl.style.top = `${nextY}px`;
  A11Y_STATE.paletteEl.style.transform = "none";
};

const endDrag = () => {
  if (!A11Y_STATE.paletteEl) return;
  A11Y_STATE.drag.active = false;
  A11Y_STATE.paletteEl.classList.remove("dragging");
  window.removeEventListener("mousemove", onDragMove);
};

const toggleLabelMode = () => {
  A11Y_STATE.labelMode = !A11Y_STATE.labelMode;
  if (A11Y_STATE.labelMode) {
    buildActionMap();
    renderLabels();
    toast("Label mode on");
  } else {
    clearLabels();
    toast("Label mode off");
  }
};

const startObserver = () => {
  if (A11Y_STATE.observer) return;
  A11Y_STATE.observer = new MutationObserver(() => {
    if (A11Y_STATE.observerTimer) return;
    A11Y_STATE.observerTimer = setTimeout(() => {
      A11Y_STATE.observerTimer = null;
      buildActionMap();
      if (A11Y_STATE.labelMode) renderLabels();
    }, 400);
  });
  A11Y_STATE.observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
  });
};

const stopObserver = () => {
  if (!A11Y_STATE.observer) return;
  A11Y_STATE.observer.disconnect();
  A11Y_STATE.observer = null;
};

const buildActionMap = () => {
  const elements = Array.from(document.querySelectorAll(ACTION_SELECTORS.join(",")));
  const map = [];
  const byId = new Map();
  let index = 1;
  for (const el of elements) {
    const info = buildActionElement(el, index);
    if (!info || !info.isVisible) continue;
    map.push(info);
    byId.set(info.id, { element: el, info });
    index += 1;
  }
  A11Y_STATE.actionMap = map;
  A11Y_STATE.actionElementsById = byId;
};

const buildActionElement = (el, index) => {
  if (!el || el === document.body || el === document.documentElement) return null;
  const rect = el.getBoundingClientRect();
  const isVisible =
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom >= 0 &&
    rect.right >= 0 &&
    rect.top <= window.innerHeight &&
    rect.left <= window.innerWidth &&
    isElementVisible(el);

  const role = detectRole(el);
  const label = extractLabel(el);
  return {
    id: `el_${String(index).padStart(5, "0")}`,
    role,
    label,
    bbox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    isVisible,
    selectorHint: buildSelectorHint(el),
    nearbyText: getNearbyText(el),
  };
};

const isElementVisible = (el) => {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (parseFloat(style.opacity) === 0) return false;
  return true;
};

const detectRole = (el) => {
  const tag = el.tagName.toLowerCase();
  if (tag === "button") return "button";
  if (tag === "a") return "link";
  if (tag === "input") return "input";
  if (tag === "textarea") return "textarea";
  if (tag === "select") return "select";
  const role = el.getAttribute("role");
  if (role === "button") return "button";
  if (role === "link") return "link";
  if (el.isContentEditable) return "input";
  return "other";
};

const extractLabel = (el) => {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl?.innerText) return labelEl.innerText.trim();
  }
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label?.innerText) return label.innerText.trim();
  }
  const placeholder = el.getAttribute("placeholder");
  if (placeholder) return placeholder.trim();
  const name = el.getAttribute("name");
  if (name) return name.trim();
  const title = el.getAttribute("title");
  if (title) return title.trim();
  const alt = el.getAttribute("alt");
  if (alt) return alt.trim();
  const text = el.innerText || el.textContent;
  if (text) return text.trim().slice(0, 120);
  return "";
};

const buildSelectorHint = (el) => {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const cls = (el.className || "").toString().split(" ").filter(Boolean);
  if (cls.length) return `${tag}.${cls[0]}`;
  return tag;
};

const getNearbyText = (el) => {
  const parent = el.parentElement;
  if (!parent) return "";
  const text = parent.innerText || parent.textContent || "";
  return text.trim().slice(0, 140);
};

const renderLabels = () => {
  ensureUi();
  clearLabels();
  A11Y_STATE.labelMap = new Map();
  const maxLabels = 9;
  const items = A11Y_STATE.actionMap.slice(0, maxLabels);
  items.forEach((item, i) => {
    const n = i + 1;
    const chip = document.createElement("div");
    chip.className = "label-chip";
    chip.textContent = String(n);
    chip.style.left = `${item.bbox.x}px`;
    chip.style.top = `${item.bbox.y}px`;
    A11Y_STATE.labelsEl.appendChild(chip);
    const ref = A11Y_STATE.actionElementsById.get(item.id);
    if (ref?.element) A11Y_STATE.labelMap.set(n, ref.element);
  });
};

const scheduleLabelRender = () => {
  if (!A11Y_STATE.labelMode) return;
  if (A11Y_STATE.labelTimer) return;
  A11Y_STATE.labelTimer = requestAnimationFrame(() => {
    A11Y_STATE.labelTimer = null;
    buildActionMap();
    renderLabels();
  });
};

const clearLabels = () => {
  if (A11Y_STATE.labelsEl) A11Y_STATE.labelsEl.innerHTML = "";
  A11Y_STATE.labelMap = new Map();
};

const onInputKeyDown = (e) => {
  if (e.key === "Escape") {
    hidePalette();
    return;
  }
  if (e.key === "Enter") {
    executeInput(A11Y_STATE.inputEl.value);
    return;
  }
  if (/^[1-9]$/.test(e.key) && A11Y_STATE.ambiguousCandidates.length) {
    chooseAmbiguous(Number(e.key));
  }
};

const executeInput = async (raw) => {
  const input = raw.trim();
  if (!input) return;
  A11Y_STATE.metrics.steps += 1;
  const parsed = parseCommand(input);
  if (!parsed) {
    toast("Command not recognized");
    return;
  }
  clearList();

  if (parsed.intent === "SCROLL") {
    const amount = parsed.amountPx || 300;
    window.scrollBy({ top: parsed.direction === "DOWN" ? amount : -amount, behavior: "smooth" });
    toast(`Scrolled ${parsed.direction.toLowerCase()}`);
    return;
  }
  if (parsed.intent === "NAV_BACK") {
    history.back();
    toast("Went back");
    return;
  }
  if (parsed.intent === "RELOAD") {
    location.reload();
    return;
  }
  if (parsed.intent === "FOCUS_NEXT" || parsed.intent === "FOCUS_PREV") {
    focusNext(parsed.intent === "FOCUS_NEXT");
    return;
  }
  if (parsed.intent === "TOGGLE_LABEL_MODE") {
    if (parsed.enabled !== A11Y_STATE.labelMode) toggleLabelMode();
    return;
  }
  if (parsed.intent === "TOGGLE_AGENT_MODE") {
    if (parsed.enabled && !A11Y_STATE.agent.enabled) toggleAgentMode();
    if (!parsed.enabled && A11Y_STATE.agent.enabled) toggleAgentMode();
    return;
  }
  if (parsed.intent === "STOP") {
    interruptAgent();
    return;
  }
  if (parsed.intent === "OPEN_NUMBER") {
    const el = A11Y_STATE.labelMap.get(parsed.n);
    if (!el) {
      toast("No element for that number");
      return;
    }
    maybeConfirmAndClick(el, `Open ${parsed.n}`);
    return;
  }
  if (parsed.intent === "CLICK") {
    handleClickTarget(parsed.targetText, input);
    return;
  }
  if (parsed.intent === "TYPE") {
    handleType(parsed.value, parsed.fieldHint, input);
    return;
  }
  if (parsed.intent === "SUBMIT") {
    handleSubmit();
  }
};

const parseCommand = (input) => {
  const text = input.trim().toLowerCase();
  if (text === "label mode on") return { intent: "TOGGLE_LABEL_MODE", enabled: true };
  if (text === "label mode off") return { intent: "TOGGLE_LABEL_MODE", enabled: false };
  if (text === "agent mode on") return { intent: "TOGGLE_AGENT_MODE", enabled: true };
  if (text === "agent mode off") return { intent: "TOGGLE_AGENT_MODE", enabled: false };
  if (STOP_WORDS.includes(text)) return { intent: "STOP" };
  const openNumber = text.match(/^open\s+(\d+)$/);
  if (openNumber) return { intent: "OPEN_NUMBER", n: Number(openNumber[1]) };
  const scroll = text.match(/^scroll\s+(down|up)(?:\s+(\d+))?$/);
  if (scroll) return { intent: "SCROLL", direction: scroll[1].toUpperCase(), amountPx: scroll[2] ? Number(scroll[2]) : undefined };
  if (text === "go back") return { intent: "NAV_BACK" };
  if (text === "reload") return { intent: "RELOAD" };
  if (text === "focus next") return { intent: "FOCUS_NEXT" };
  if (text === "focus previous") return { intent: "FOCUS_PREV" };
  if (text === "submit") return { intent: "SUBMIT" };
  const click = text.match(/^(click|open)\s+(.+)$/);
  if (click) return { intent: "CLICK", targetText: click[2] };
  const type = input.match(/^type\s+(.+)\s+into\s+(.+)$/i);
  if (type) return { intent: "TYPE", value: type[1], fieldHint: type[2] };
  return null;
};

const handleClickTarget = (targetText, rawCommand) => {
  buildActionMap();
  const candidates = scoreCandidates(targetText, "CLICK");
  if (!candidates.length) {
    toast("No matching element found");
    return;
  }
  const [top, second] = candidates;
  if (top.score >= 0.75 && (!second || top.score - second.score >= 0.1)) {
    maybeConfirmAndClick(top.element, top.info.label || targetText);
    return;
  }
  resolveWithAi(rawCommand, candidates).catch(() => showAmbiguity(candidates));
};

const handleType = (value, fieldHint, rawCommand) => {
  buildActionMap();
  const candidates = scoreCandidates(fieldHint, "TYPE");
  if (!candidates.length) {
    toast("No field matched");
    return;
  }
  const [top, second] = candidates;
  if (top.score >= 0.75 && (!second || top.score - second.score >= 0.1)) {
    typeInto(top.element, value);
    toast(`Typed into ${top.info.label || fieldHint}`);
    return;
  }
  resolveWithAi(rawCommand, candidates, (chosen) => {
    typeInto(chosen.element, value);
    toast(`Typed into ${chosen.info.label || fieldHint}`);
  }).catch(() => {
    showAmbiguity(candidates, (chosen) => {
      typeInto(chosen.element, value);
      toast(`Typed into ${chosen.info.label || fieldHint}`);
    });
  });
};

const handleSubmit = () => {
  const form = document.querySelector("form");
  if (!form) {
    toast("No form found");
    return;
  }
  maybeConfirmDanger("submit", () => {
    form.requestSubmit?.() || form.submit();
    toast("Submitted form");
  });
};

const scoreCandidates = (targetText, intent) => {
  const target = normalize(targetText);
  const results = [];
  for (const item of A11Y_STATE.actionMap) {
    const label = normalize(item.label || "");
    if (!label) continue;
    const score = scoreLabel(target, label);
    if (score <= 0) continue;
    let boost = 0;
    if (intent === "CLICK" && (item.role === "button" || item.role === "link")) boost += 0.12;
    if (intent === "TYPE" && (item.role === "input" || item.role === "textarea" || item.role === "select")) boost += 0.2;
    if (item.isVisible) boost += 0.08;
    const finalScore = Math.min(1, score + boost);
    const ref = A11Y_STATE.actionElementsById.get(item.id);
    if (ref?.element) results.push({ element: ref.element, info: item, score: finalScore });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 9);
};

const scoreLabel = (target, label) => {
  if (!target || !label) return 0;
  if (target === label) return 1;
  if (label.includes(target)) return Math.min(1, target.length / label.length + 0.3);
  if (target.includes(label)) return Math.min(1, label.length / target.length + 0.2);
  const t = target.split(/\s+/);
  const l = label.split(/\s+/);
  const setT = new Set(t);
  const setL = new Set(l);
  let inter = 0;
  for (const word of setT) if (setL.has(word)) inter += 1;
  const union = new Set([...setT, ...setL]).size || 1;
  return inter / union;
};

const normalize = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

const showAmbiguity = (candidates, onChoose) => {
  A11Y_STATE.metrics.ambiguity += 1;
  A11Y_STATE.ambiguousCandidates = candidates;
  A11Y_STATE.listEl.innerHTML = "";
  candidates.forEach((cand, idx) => {
    const n = idx + 1;
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `<strong>${n}.</strong> ${cand.info.label || cand.info.selectorHint || cand.info.role}`;
    item.addEventListener("click", () => {
      if (onChoose) onChoose(cand);
      else maybeConfirmAndClick(cand.element, cand.info.label || cand.info.role);
      clearList();
    });
    A11Y_STATE.listEl.appendChild(item);
  });
  updateMetrics();
  toast("Multiple matches. Choose 1-9.");
};

const showClarificationOptions = (candidates, onChoose) => {
  const limited = candidates.slice(0, 5);
  A11Y_STATE.agent.clarification = { candidates: limited, onChoose };
  showAmbiguity(limited, (chosen) => {
    A11Y_STATE.agent.clarification = null;
    onChoose(chosen);
  });
};

const handleClarificationChoice = (n) => {
  const clarification = A11Y_STATE.agent.clarification;
  if (!clarification) return;
  const cand = clarification.candidates[n - 1];
  if (!cand) return;
  A11Y_STATE.agent.clarification = null;
  clarification.onChoose(cand);
  clearList();
};

const confirmAgentAction = (message, onConfirm) => {
  A11Y_STATE.agent.confirmation = { onConfirm };
  A11Y_STATE.agent.state = "NEED_CLARIFICATION";
  showConfirm(message, () => {
    A11Y_STATE.agent.confirmation = null;
    onConfirm();
  });
  updateAgentUi();
};

const handleConfirmationChoice = (text) => {
  if (!A11Y_STATE.agent.confirmation) return false;
  const norm = text.toLowerCase();
  if (norm.includes("yes") || norm.includes("proceed") || norm.includes("confirm")) {
    const { onConfirm } = A11Y_STATE.agent.confirmation;
    A11Y_STATE.agent.confirmation = null;
    clearList();
    onConfirm();
    A11Y_STATE.agent.state = "EXECUTING";
    updateAgentUi();
    return true;
  }
  if (norm.includes("no") || norm.includes("cancel") || norm.includes("stop")) {
    A11Y_STATE.agent.confirmation = null;
    clearList();
    interruptAgent();
    return true;
  }
  return false;
};

const resolveWithAi = async (rawCommand, candidates, onChoose) => {
  const backendUrl = (A11Y_STATE.settings.backendUrl || "").trim();
  if (!backendUrl) {
    showAmbiguity(candidates, onChoose);
    return;
  }
  const resolveUrl = backendUrl.endsWith("/plan")
    ? backendUrl.replace(/\/plan$/, "/resolve")
    : backendUrl.endsWith("/resolve")
    ? backendUrl
    : `${backendUrl.replace(/\/+$/, "")}/resolve`;
  A11Y_STATE.listEl.innerHTML = `<div class="list-item">Resolving with AI...</div>`;
  const payload = {
    command: rawCommand,
    url: location.href,
    candidates: candidates.map((c) => ({
      id: c.info.id,
      role: c.info.role,
      label: c.info.label,
      nearbyText: c.info.nearbyText,
      selectorHint: c.info.selectorHint,
    })),
  };
  const res = await fetch(resolveUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("AI request failed");
  const data = await res.json();
  if (data?.needsConfirmation || !data?.chosenId) {
    showAmbiguity(candidates, onChoose);
    return;
  }
  const chosen = candidates.find((c) => c.info.id === data.chosenId);
  if (!chosen) {
    showAmbiguity(candidates, onChoose);
    return;
  }
  if (onChoose) onChoose(chosen);
  else maybeConfirmAndClick(chosen.element, chosen.info.label || chosen.info.role);
  clearList();
};

const chooseAmbiguous = (n) => {
  const cand = A11Y_STATE.ambiguousCandidates[n - 1];
  if (!cand) return;
  maybeConfirmAndClick(cand.element, cand.info.label || cand.info.role);
  clearList();
};

const clearList = () => {
  if (A11Y_STATE.listEl) A11Y_STATE.listEl.innerHTML = "";
  A11Y_STATE.ambiguousCandidates = [];
};

const maybeConfirmAndClick = (element, label) => {
  const text = (label || "").toLowerCase();
  const isDangerous = DANGEROUS_KEYWORDS.some((k) => text.includes(k));
  if (A11Y_STATE.settings.confirmDanger && isDangerous) {
    showConfirm(`Confirm action: ${label || "click"}`, () => {
      safeClick(element);
      toast(`Clicked: ${label || "element"}`);
    });
    return;
  }
  safeClick(element);
  toast(`Clicked: ${label || "element"}`);
};

const maybeConfirmDanger = (label, onConfirm) => {
  if (!A11Y_STATE.settings.confirmDanger) {
    onConfirm();
    return;
  }
  showConfirm(`Confirm action: ${label}`, onConfirm);
};

const showConfirm = (message, onConfirm) => {
  A11Y_STATE.listEl.innerHTML = `
    <div class="list-item">${message}</div>
    <div class="confirm-row">
      <button class="cancel-btn">Cancel</button>
      <button class="confirm-btn">Confirm</button>
    </div>
  `;
  A11Y_STATE.listEl.querySelector(".cancel-btn").addEventListener("click", clearList);
  A11Y_STATE.listEl.querySelector(".confirm-btn").addEventListener("click", () => {
    clearList();
    onConfirm();
  });
};

const safeClick = (el) => {
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.focus?.();
  el.click?.();
};

const typeInto = (el, value) => {
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  if (el.isContentEditable) {
    el.textContent = value;
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.focus?.();
};

const focusNext = (forward) => {
  const focusable = Array.from(document.querySelectorAll("a[href], button, input, textarea, select, [tabindex]"))
    .filter((el) => !el.disabled && isElementVisible(el));
  if (!focusable.length) return;
  const active = document.activeElement;
  let idx = focusable.indexOf(active);
  idx = idx === -1 ? 0 : idx;
  const next = forward ? idx + 1 : idx - 1;
  const target = focusable[(next + focusable.length) % focusable.length];
  target.focus();
  toast(`Focused ${forward ? "next" : "previous"}`);
};

const toast = (message) => {
  if (!A11Y_STATE.toastEl) return;
  A11Y_STATE.toastEl.textContent = message;
  A11Y_STATE.toastEl.style.display = "block";
  clearTimeout(A11Y_STATE.toastTimer);
  A11Y_STATE.toastTimer = setTimeout(() => {
    if (A11Y_STATE.toastEl) A11Y_STATE.toastEl.style.display = "none";
  }, 1600);
};

const updateMetrics = () => {
  if (!A11Y_STATE.metricsEl) return;
  if (!A11Y_STATE.settings.demoMetrics) {
    A11Y_STATE.metricsEl.style.display = "none";
    return;
  }
  const elapsed = A11Y_STATE.metrics.sessionStart
    ? ((Date.now() - A11Y_STATE.metrics.sessionStart) / 1000).toFixed(1)
    : "0.0";
  A11Y_STATE.metricsEl.style.display = "block";
  A11Y_STATE.metricsEl.textContent = `Steps: ${A11Y_STATE.metrics.steps} | Time: ${elapsed}s | Ambiguity: ${A11Y_STATE.metrics.ambiguity}`;
};

const updateAgentUi = () => {
  if (!A11Y_STATE.agentStatusEl) return;
  const { state, transcript, stepIndex, plan, enabled, currentActionLabel } = A11Y_STATE.agent;
  A11Y_STATE.agentStatusEl.textContent = ` ${state}`;
  A11Y_STATE.agentTranscriptEl.textContent = `Transcript: ${transcript || "—"}`;
  if (plan.length) {
    const label = currentActionLabel ? ` - ${currentActionLabel}` : "";
    A11Y_STATE.agentStepEl.textContent = `Step: ${stepIndex + 1}/${plan.length}${label}`;
  } else {
    A11Y_STATE.agentStepEl.textContent = "Step: —";
  }
  if (enabled) A11Y_STATE.agentToggleBtn.classList.add("active");
  else A11Y_STATE.agentToggleBtn.classList.remove("active");
};

const toggleAgentMode = () => {
  if (!A11Y_STATE.settings.agentModeEnabled) {
    toast("Enable agent mode in settings");
    return;
  }
  if (A11Y_STATE.agent.enabled) {
    stopAgent();
  } else {
    A11Y_STATE.agent.enabled = true;
    startAgentListening();
  }
  updateAgentUi();
};

const startAgentListening = () => {
  if (!A11Y_STATE.settings.voiceEnabled) {
    toast("Voice is disabled in settings");
    return;
  }
  const Speech = window.webkitSpeechRecognition || window.SpeechRecognition;
  if (!Speech) {
    toast("Speech recognition not supported");
    return;
  }
  stopVoice();
  A11Y_STATE.agent.interrupt = false;
  A11Y_STATE.agent.state = "LISTENING";
  updateAgentUi();
  const recognition = new Speech();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      transcript += event.results[i][0].transcript;
    }
    transcript = transcript.trim();
    if (!transcript) return;
    A11Y_STATE.agent.transcript = transcript;
    updateAgentUi();
    if (A11Y_STATE.agent.state === "NEED_CLARIFICATION") {
      const option = parseOptionSelection(transcript);
      if (option) {
        handleClarificationChoice(option);
        return;
      }
      if (handleConfirmationChoice(transcript)) return;
      return;
    }
    const state = A11Y_STATE.agent.state;
    const trimmed = transcript.toLowerCase().trim();
    if ((state === "EXECUTING" || state === "PAUSED") && containsStopWord(transcript)) {
      interruptAgent();
      return;
    }
    if (state === "LISTENING" && STOP_WORDS.includes(trimmed)) {
      interruptAgent();
      return;
    }
    if (A11Y_STATE.agent.state !== "LISTENING") return;
    schedulePlanning(transcript);
  };
  recognition.onend = () => {
    if (A11Y_STATE.agent.enabled && A11Y_STATE.agent.state !== "OFF") {
      startAgentListening();
    }
  };
  recognition.onerror = () => {
    if (A11Y_STATE.agent.enabled) {
      toast("Voice error. Retrying...");
    }
  };
  A11Y_STATE.recognition = recognition;
  recognition.start();
};

const stopAgent = () => {
  A11Y_STATE.agent.enabled = false;
  A11Y_STATE.agent.state = "OFF";
  A11Y_STATE.agent.plan = [];
  A11Y_STATE.agent.stepIndex = 0;
  A11Y_STATE.agent.transcript = "";
  A11Y_STATE.agent.lastUtterance = "";
  A11Y_STATE.agent.lastElement = null;
  A11Y_STATE.agent.currentActionLabel = "";
  A11Y_STATE.agent.interrupt = true;
  if (A11Y_STATE.agent.pauseTimer) clearTimeout(A11Y_STATE.agent.pauseTimer);
  A11Y_STATE.agent.pauseTimer = null;
  stopScrollLoop();
  if (A11Y_STATE.recognition) {
    try {
      A11Y_STATE.recognition.stop();
    } catch (_) {}
  }
  A11Y_STATE.recognition = null;
  updateAgentUi();
};

const interruptAgent = () => {
  A11Y_STATE.agent.interrupt = true;
  A11Y_STATE.agent.state = "PAUSED";
  stopScrollLoop();
  toast("Stopped.");
  updateAgentUi();
};

const schedulePlanning = (utterance) => {
  if (A11Y_STATE.agent.pauseTimer) clearTimeout(A11Y_STATE.agent.pauseTimer);
  A11Y_STATE.agent.pauseTimer = setTimeout(() => {
    if (!A11Y_STATE.agent.enabled) return;
    if (utterance === A11Y_STATE.agent.lastUtterance) return;
    A11Y_STATE.agent.lastUtterance = utterance;
    planAndExecute(utterance);
  }, 900);
};

const containsStopWord = (text) => {
  const norm = text.toLowerCase();
  return STOP_WORDS.some((w) => norm.includes(w));
};

const parseOptionSelection = (text) => {
  const norm = text.toLowerCase();
  for (const [phrase, n] of Object.entries(OPTION_WORDS)) {
    if (norm.includes(`option ${phrase}`) || norm.includes(phrase)) {
      return n;
    }
  }
  return null;
};

const isDangerousText = (text) => {
  const norm = (text || "").toLowerCase();
  return DANGEROUS_KEYWORDS.some((k) => norm.includes(k));
};

const validatePlan = (plan) => {
  if (!plan || !Array.isArray(plan.actions)) return false;
  return plan.actions.every((action) => {
    if (!action || !AGENT_ACTION_KINDS.includes(action.kind)) return false;
    if (action.kind === "SCROLL") {
      if (!SCROLL_MODES.includes(action.mode)) return false;
      if (!["DOWN", "UP"].includes(action.direction)) return false;
      if (action.mode === "UNTIL" && !SCROLL_UNTIL.includes(action.until)) return false;
    }
    if (action.kind === "PRESS_KEY" && !PRESS_KEYS.includes(action.key)) return false;
    if (action.kind === "READ_PAGE_SUMMARY" && !["ARTICLE_MAIN", "VISIBLE"].includes(action.scope || "ARTICLE_MAIN")) return false;
    return true;
  });
};

const planLocally = (utterance) => {
  const text = utterance.toLowerCase().trim();
  if (!text) return null;
  if (text.includes("explain this article") || text.includes("explain this page") || text.includes("summarize this")) {
    return { actions: [{ kind: "READ_PAGE_SUMMARY", scope: "ARTICLE_MAIN" }] };
  }
  if (text.includes("scroll down until i say stop") || text.includes("scroll until i say stop")) {
    return { actions: [{ kind: "SCROLL", direction: "DOWN", mode: "UNTIL", until: "STOP_WORD" }] };
  }
  const findMatch = text.match(/find (the )?keyword (.+)/);
  if (findMatch) {
    return {
      actions: [
        { kind: "SCROLL", direction: "DOWN", mode: "UNTIL", until: "FOUND_TEXT", text: findMatch[2].trim() },
      ],
    };
  }
  const scrollFind = text.match(/scroll down and find (.+)/);
  if (scrollFind) {
    return {
      actions: [
        { kind: "SCROLL", direction: "DOWN", mode: "UNTIL", until: "FOUND_TEXT", text: scrollFind[1].trim() },
      ],
    };
  }
  const phrases = text.split(/,| then | and then | and /).map((p) => p.trim()).filter(Boolean);
  const actions = [];
  for (const phrase of phrases) {
    const action = parseSimpleAction(phrase);
    if (action) actions.push(action);
  }
  if (!actions.length) return null;
  return { actions };
};

const extractPageKeywords = () => {
  const keywords = new Set();
  const addTokens = (text) => {
    if (!text) return;
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3 && t.length <= 20)
      .slice(0, 80)
      .forEach((t) => keywords.add(t));
  };
  const headings = Array.from(document.querySelectorAll("h1,h2,h3")).slice(0, 8);
  headings.forEach((h) => addTokens(h.innerText));
  const buttons = Array.from(document.querySelectorAll("button, a, [role='button'], [role='link']")).slice(0, 12);
  buttons.forEach((b) => addTokens(b.innerText || b.getAttribute("aria-label")));
  const inputs = Array.from(document.querySelectorAll("input, textarea, select")).slice(0, 10);
  inputs.forEach((i) => addTokens(i.getAttribute("placeholder") || i.getAttribute("aria-label") || i.getAttribute("name")));
  return Array.from(keywords).slice(0, 40);
};

const parseSimpleAction = (phrase) => {
  if (!phrase) return null;
  if (phrase.includes("press enter") || phrase === "enter") {
    return { kind: "PRESS_KEY", key: "ENTER" };
  }
  if (phrase.includes("press tab")) return { kind: "PRESS_KEY", key: "TAB" };
  if (phrase.includes("press escape") || phrase.includes("press esc")) return { kind: "PRESS_KEY", key: "ESC" };
  const click = phrase.match(/^(click|open)\s+(.+)$/);
  if (click) {
    const target = click[2];
    if (target.includes("first")) return { kind: "CLICK", target: { by: "NUMBER", value: 1 } };
    if (target.includes("second")) return { kind: "CLICK", target: { by: "NUMBER", value: 2 } };
    return { kind: "CLICK", target: { by: "TEXT", value: target } };
  }
  const type = phrase.match(/^type\s+(.+)\s+into\s+(.+)$/);
  if (type) return { kind: "TYPE", value: type[1], fieldHint: type[2] };
  const typeOnly = phrase.match(/^type\s+(.+)$/);
  if (typeOnly) return { kind: "TYPE", value: typeOnly[1] };
  if (phrase.startsWith("scroll down")) return { kind: "SCROLL", direction: "DOWN", mode: "ONCE" };
  if (phrase.startsWith("scroll up")) return { kind: "SCROLL", direction: "UP", mode: "ONCE" };
  return null;
};

const planAndExecute = async (utterance) => {
  if (!A11Y_STATE.agent.enabled) return;
  const backendUrl = (A11Y_STATE.settings.backendUrl || "").trim();
  A11Y_STATE.agent.state = "PLANNING";
  A11Y_STATE.agent.interrupt = false;
  updateAgentUi();
  buildActionMap();
  const candidates = A11Y_STATE.actionMap.slice(0, 20);
  try {
    const localPlan = planLocally(utterance);
    const plan = localPlan || (backendUrl ? await planWithAi(backendUrl, utterance, candidates) : null);
    if (!plan) {
      toast("Set backend URL for agent planning");
      A11Y_STATE.agent.state = "LISTENING";
      updateAgentUi();
      return;
    }
    if (!validatePlan(plan)) {
      toast("Invalid plan");
      A11Y_STATE.agent.state = "LISTENING";
      updateAgentUi();
      return;
    }
    if (plan.needsClarification) {
      toast("Need clarification");
    }
    if (!plan?.actions?.length) {
      toast("No plan returned");
      A11Y_STATE.agent.state = "LISTENING";
      updateAgentUi();
      return;
    }
    A11Y_STATE.agent.plan = plan.actions;
    A11Y_STATE.agent.stepIndex = 0;
    if (plan.needsConfirmation) {
      confirmAgentAction("Confirm action plan", async () => {
        A11Y_STATE.agent.state = "EXECUTING";
        updateAgentUi();
        await executePlan(plan.actions);
      });
    } else {
      A11Y_STATE.agent.state = "EXECUTING";
      updateAgentUi();
      await executePlan(plan.actions);
    }
    if (A11Y_STATE.agent.enabled && !A11Y_STATE.agent.interrupt) {
      A11Y_STATE.agent.state = "LISTENING";
      updateAgentUi();
    }
  } catch (err) {
    toast("Planning failed");
    A11Y_STATE.agent.state = "LISTENING";
    updateAgentUi();
  }
};

const planWithAi = async (backendUrl, utterance, candidates) => {
  const planUrl = backendUrl.endsWith("/resolve")
    ? backendUrl.replace(/\/resolve$/, "/plan")
    : backendUrl.endsWith("/plan")
    ? backendUrl
    : `${backendUrl.replace(/\/+$/, "")}/plan`;
  const pageKeywords = extractPageKeywords();
  const payload = {
    utterance,
    url: location.href,
    mode: "AGENT",
    pageKeywords,
    candidates: candidates.map((c) => ({
      id: c.id,
      role: c.role,
      label: c.label,
      nearbyText: c.nearbyText,
      selectorHint: c.selectorHint,
    })),
  };
  const res = await fetch(planUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Plan request failed");
  return res.json();
};

const executePlan = async (actions) => {
  for (let i = 0; i < actions.length; i += 1) {
    if (A11Y_STATE.agent.interrupt) break;
    A11Y_STATE.agent.stepIndex = i;
    A11Y_STATE.agent.currentActionLabel = describeAction(actions[i]);
    updateAgentUi();
    // eslint-disable-next-line no-await-in-loop
    await executeAction(actions[i]);
  }
};

const describeAction = (action) => {
  if (!action) return "";
  if (action.kind === "CLICK") return `Click ${action.target?.value || ""}`.trim();
  if (action.kind === "TYPE") return `Type ${action.value || ""}`.trim();
  if (action.kind === "PRESS_KEY") return `Press ${action.key}`;
  if (action.kind === "SCROLL") return `Scroll ${action.direction?.toLowerCase()}`;
  if (action.kind === "READ_PAGE_SUMMARY") return "Summarize page";
  if (action.kind === "STOP") return "Stop";
  return action.kind;
};
const executeAction = async (action) => {
  if (!action || A11Y_STATE.agent.interrupt) return;
  const kind = action.kind;
  if (kind === "STOP") {
    interruptAgent();
    return;
  }
  if (kind === "SCROLL") {
    if (action.mode === "UNTIL") {
      if (action.until === "FOUND_TEXT" && action.text) {
        await scrollUntilFoundText(action.direction, action.text);
      } else {
        await scrollUntilStop(action.direction);
      }
      return;
    }
    const amount = action.amountPx || 300;
    window.scrollBy({ top: action.direction === "DOWN" ? amount : -amount, behavior: "smooth" });
    await delay(400);
    return;
  }
  if (kind === "CLICK") {
    await executeClickTarget(action.target);
    return;
  }
  if (kind === "TYPE") {
    await executeType(action.value, action.fieldHint);
    return;
  }
  if (kind === "PRESS_KEY") {
    pressKey(action.key || "ENTER");
    await delay(150);
    return;
  }
  if (kind === "READ_PAGE_SUMMARY") {
    await summarizePage(action.scope || "ARTICLE_MAIN");
    return;
  }
  if (kind === "FIND_TEXT") {
    toast("Find text not implemented yet");
    return;
  }
  if (kind === "ASK_CLARIFICATION") {
    toast(action.question || "Need clarification");
    return;
  }
};

const executeClickTarget = async (target) => {
  if (!target) return;
  if (target.by === "NUMBER") {
    if (!A11Y_STATE.labelMode) {
      A11Y_STATE.labelMode = true;
      renderLabels();
    }
    const el = A11Y_STATE.labelMap.get(Number(target.value));
    if (el) {
      const label = `Open ${target.value}`;
      if (isDangerousText(label)) {
        confirmAgentAction(`Confirm action: ${label}`, () => safeClick(el));
      } else {
        safeClick(el);
      }
      A11Y_STATE.agent.lastElement = el;
    } else {
      toast("No element for that number");
    }
    return;
  }
  if (target.by === "TEXT") {
    buildActionMap();
    const candidates = scoreCandidates(target.value, "CLICK");
    if (!candidates.length) {
      toast("No matching element found");
      return;
    }
    const [top, second] = candidates;
    if (top.score >= 0.75 && (!second || top.score - second.score >= 0.1)) {
      const label = top.info.label || target.value;
      if (isDangerousText(label)) {
        confirmAgentAction(`Confirm action: ${label}`, () => maybeConfirmAndClick(top.element, label));
      } else {
        maybeConfirmAndClick(top.element, label);
      }
      A11Y_STATE.agent.lastElement = top.element;
      return;
    }
    A11Y_STATE.agent.state = "NEED_CLARIFICATION";
    showClarificationOptions(candidates, (chosen) => {
      if (A11Y_STATE.agent.interrupt) return;
      const label = chosen.info.label || chosen.info.role;
      if (isDangerousText(label)) {
        confirmAgentAction(`Confirm action: ${label}`, () => maybeConfirmAndClick(chosen.element, label));
      } else {
        maybeConfirmAndClick(chosen.element, label);
      }
      A11Y_STATE.agent.lastElement = chosen.element;
      A11Y_STATE.agent.state = "EXECUTING";
      updateAgentUi();
    });
  }
};

const executeType = async (value, fieldHint) => {
  if (!value) return;
  if (!fieldHint && A11Y_STATE.agent.lastElement) {
    typeInto(A11Y_STATE.agent.lastElement, value);
    return;
  }
  if (!fieldHint && document.activeElement) {
    typeInto(document.activeElement, value);
    return;
  }
  buildActionMap();
  const candidates = scoreCandidates(fieldHint || "", "TYPE");
  if (!candidates.length) {
    toast("No field matched");
    return;
  }
  const [top, second] = candidates;
  if (top.score >= 0.75 && (!second || top.score - second.score >= 0.1)) {
    typeInto(top.element, value);
    return;
  }
  A11Y_STATE.agent.state = "NEED_CLARIFICATION";
  showClarificationOptions(candidates, (chosen) => {
    if (A11Y_STATE.agent.interrupt) return;
    typeInto(chosen.element, value);
    A11Y_STATE.agent.state = "EXECUTING";
    updateAgentUi();
  });
};

const pressKey = (key) => {
  const el = document.activeElement || document.body;
  const eventInit = { key, code: key, bubbles: true };
  el.dispatchEvent(new KeyboardEvent("keydown", eventInit));
  el.dispatchEvent(new KeyboardEvent("keyup", eventInit));
};

const scrollUntilStop = async (direction) => {
  stopScrollLoop();
  return new Promise((resolve) => {
    A11Y_STATE.agent.scrollTimer = setInterval(() => {
      if (A11Y_STATE.agent.interrupt) {
        stopScrollLoop();
        resolve();
        return;
      }
      window.scrollBy({ top: direction === "DOWN" ? 240 : -240, behavior: "smooth" });
    }, 300);
  });
};

const scrollUntilFoundText = async (direction, text) => {
  const needle = text.toLowerCase();
  stopScrollLoop();
  return new Promise((resolve) => {
    A11Y_STATE.agent.scrollTimer = setInterval(() => {
      if (A11Y_STATE.agent.interrupt) {
        stopScrollLoop();
        resolve();
        return;
      }
      const bodyText = (document.body?.innerText || "").toLowerCase();
      if (bodyText.includes(needle)) {
        stopScrollLoop();
        toast(`Found "${text}"`);
        resolve();
        return;
      }
      window.scrollBy({ top: direction === "DOWN" ? 240 : -240, behavior: "smooth" });
    }, 300);
  });
};

const stopScrollLoop = () => {
  if (A11Y_STATE.agent.scrollTimer) {
    clearInterval(A11Y_STATE.agent.scrollTimer);
    A11Y_STATE.agent.scrollTimer = null;
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const summarizePage = async (scope) => {
  const backendUrl = (A11Y_STATE.settings.backendUrl || "").trim();
  if (!backendUrl) {
    toast("Set backend URL for summary");
    return;
  }
  const text = extractArticleText(scope);
  if (!text) {
    toast("No readable text found");
    return;
  }
  A11Y_STATE.listEl.innerHTML = `<div class="list-item">Summarizing...</div>`;
  try {
    const summary = await summarizeWithAi(backendUrl, text);
    renderSummary(summary);
    if (summary?.overview) speak(summary.overview);
  } catch (err) {
    toast("Summary failed");
  }
};

const extractArticleText = (scope) => {
  let el = null;
  if (scope === "ARTICLE_MAIN") {
    el = document.querySelector("article") || document.querySelector("main") || document.querySelector("[role='main']");
  }
  if (!el) el = document.body;
  if (!el) return "";
  const text = (el.innerText || "").replace(/\s+/g, " ").trim();
  return text.slice(0, 6000);
};

const summarizeWithAi = async (backendUrl, text) => {
  const summarizeUrl = backendUrl.endsWith("/resolve")
    ? backendUrl.replace(/\/resolve$/, "/summarize")
    : backendUrl.endsWith("/plan")
    ? backendUrl.replace(/\/plan$/, "/summarize")
    : `${backendUrl.replace(/\/+$/, "")}/summarize`;
  const res = await fetch(summarizeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Summary request failed");
  return res.json();
};

const renderSummary = (summary) => {
  if (!summary) return;
  const bullets = (summary.bullets || []).map((b) => `<li>${b}</li>`).join("");
  const terms = (summary.keyTerms || []).map((t) => `<li>${t}</li>`).join("");
  A11Y_STATE.listEl.innerHTML = `
    <div class="list-item"><strong>Overview</strong><div>${summary.overview || "—"}</div></div>
    <div class="list-item"><strong>Key Points</strong><ul>${bullets}</ul></div>
    ${terms ? `<div class="list-item"><strong>Key Terms</strong><ul>${terms}</ul></div>` : ""}
  `;
};

const speak = (text) => {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};


const toggleVoice = () => {
  if (!A11Y_STATE.settings.voiceEnabled) {
    toast("Voice is disabled in settings");
    return;
  }
  if (A11Y_STATE.recognition) {
    stopVoice();
  } else {
    startVoice();
  }
};

const startVoice = () => {
  const Speech = window.webkitSpeechRecognition || window.SpeechRecognition;
  if (!Speech) {
    toast("Speech recognition not supported");
    return;
  }
  const recognition = new Speech();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const transcript = last[0].transcript.trim();
    A11Y_STATE.inputEl.value = transcript;
    if (last.isFinal) executeInput(transcript);
  };
  recognition.onend = () => {
    A11Y_STATE.recognition = null;
    A11Y_STATE.micBtn.classList.remove("active");
  };
  recognition.onerror = () => {
    A11Y_STATE.recognition = null;
    A11Y_STATE.micBtn.classList.remove("active");
  };
  A11Y_STATE.recognition = recognition;
  A11Y_STATE.micBtn.classList.add("active");
  recognition.start();
};

const stopVoice = () => {
  if (A11Y_STATE.recognition) {
    try {
      A11Y_STATE.recognition.stop();
    } catch (_) {}
  }
  A11Y_STATE.recognition = null;
  if (A11Y_STATE.micBtn) A11Y_STATE.micBtn.classList.remove("active");
};

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "A11Y_TOGGLE_PALETTE") {
    togglePalette();
  }
  if (msg?.type === "A11Y_TOGGLE_LABELS") {
    toggleLabelMode();
  }
  if (msg?.type === "A11Y_TOGGLE_AGENT") {
    toggleAgentMode();
  }
});

document.addEventListener("keydown", (e) => {
  if (!A11Y_STATE.paletteOpen) return;
  if (e.key === "Escape") {
    hidePalette();
  }
});

window.addEventListener("scroll", scheduleLabelRender, { passive: true });
window.addEventListener("resize", scheduleLabelRender);
