const A11Y_STATE = {
  paletteOpen: false,
  labelMode: false,
  actionMap: [],
  actionElementsById: new Map(),
  labelMap: new Map(),
  ambiguousCandidates: [],
  actionMapStale: true,
  actionMapBuildPending: false,
  lastActionMapBuildAt: 0,
  metrics: {
    sessionStart: 0,
    steps: 0,
    ambiguity: 0,
  },
  settings: {
    voiceEnabled: true,
    textToSpeechEnabled: true,
    agentModeEnabled: true,
    confirmDanger: true,
    demoMetrics: true,
    visualPrefs: {
      bodyBackground: "#ffffff",
      bodyTextColor: "#111111",
      linksUnderline: true,
      keyboardFocus: true,
      focusRingEnabled: true,
      focusRingColor: "#1a73e8",
      contrastHelper: "none",
    },
    visualEffectsEnabled: false,
    focusModeEnabled: false,
    backendUrl: "http://localhost:8787/resolve",
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
  helpBtn: null,
  metricsEl: null,
  toastEl: null,
  summaryEl: null,
  summaryContentEl: null,
  summaryContinueBtn: null,
  debugEl: null,
  debugEnabled: true,
  pageContext: null,
  pageContextInit: false,
  pageGuide: null,
  pageGuideAt: 0,
  pageGuideUrl: "",
  labelsEl: null,
  micBtn: null,
  agentToggleBtn: null,
  agentStatusEl: null,
  agentTranscriptEl: null,
  agentStepEl: null,
  agentStopBtn: null,
  focusToggleBtn: null,
  paletteEl: null,
  dragHandleEl: null,
  lastSummaryText: "",
  ttsPaused: false,
  drag: {
    active: false,
    offsetX: 0,
    offsetY: 0,
  },
  focusMainEl: null,
  focusSyncRaf: null,
};

const DEFAULT_VISUAL_SETTINGS = {
  enabled: false,
  bodyBackground: "#ffffff",
  bodyTextColor: "#111111",
  contrastScale: 1,
  linksUnderline: true,
  keyboardFocus: true,
  focusRingEnabled: true,
  focusRingColor: "#1a73e8",
  contrastHelper: "none",
  zoomPercent: 100,
};

const DEFAULT_SETTINGS = {
  voiceEnabled: true,
  textToSpeechEnabled: true,
  agentModeEnabled: true,
  confirmDanger: true,
  demoMetrics: true,
  backendUrl: "http://localhost:8787/resolve",
  visualPrefs: DEFAULT_VISUAL_SETTINGS,
  visualEffectsEnabled: false,
  focusModeEnabled: false,
};

const VISUAL_PRESETS = {
  highContrastDark: {
    bodyBackground: "#000000",
    bodyTextColor: "#ffffff",
    contrastScale: 1.2,
    linksUnderline: true,
    keyboardFocus: true,
    focusRingEnabled: true,
    focusRingColor: "#ffbf00",
    contrastHelper: "strong",
  },
  highContrastLight: {
    bodyBackground: "#fffbea",
    bodyTextColor: "#111111",
    contrastScale: 1.15,
    linksUnderline: true,
    keyboardFocus: true,
    focusRingEnabled: true,
    focusRingColor: "#005fcc",
    contrastHelper: "soft",
  },
  creamPaper: {
    bodyBackground: "#fff7de",
    bodyTextColor: "#222222",
    contrastScale: 1.05,
    linksUnderline: true,
    keyboardFocus: true,
    focusRingEnabled: true,
    focusRingColor: "#1a5fb4",
    contrastHelper: "soft",
    zoomPercent: 105,
  },
  blueYellowContrast: {
    bodyBackground: "#0a1f44",
    bodyTextColor: "#ffe066",
    contrastScale: 1.2,
    linksUnderline: true,
    keyboardFocus: true,
    focusRingEnabled: true,
    focusRingColor: "#82cfff",
    contrastHelper: "strong",
    zoomPercent: 110,
  },
};

const VISUAL_STYLE_ID = "a11y-autopilot-visual-style";
const VISUAL_ROOT_ID = "a11y-autopilot-visual-root";
const FOCUS_STYLE_ID = "a11y-autopilot-focus-style";

const isHexColor = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim());

const clampContrastHelper = (value) => {
  if (value === "soft" || value === "strong") return value;
  return "none";
};

const clampContrastScale = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(2, Math.max(0.8, Math.round(n * 100) / 100));
};

const clampZoomPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 100;
  return Math.min(200, Math.max(50, Math.round(n)));
};

const mergeVisualPrefs = (prefs = {}) => ({
  ...DEFAULT_VISUAL_SETTINGS,
  ...prefs,
  enabled: prefs.enabled === true,
  bodyBackground: isHexColor(prefs.bodyBackground) ? prefs.bodyBackground.trim() : DEFAULT_VISUAL_SETTINGS.bodyBackground,
  bodyTextColor: isHexColor(prefs.bodyTextColor) ? prefs.bodyTextColor.trim() : DEFAULT_VISUAL_SETTINGS.bodyTextColor,
  contrastScale: clampContrastScale(prefs.contrastScale),
  focusRingColor: isHexColor(prefs.focusRingColor) ? prefs.focusRingColor.trim() : DEFAULT_VISUAL_SETTINGS.focusRingColor,
  linksUnderline: prefs.linksUnderline !== false,
  keyboardFocus: prefs.keyboardFocus !== false,
  focusRingEnabled: prefs.focusRingEnabled !== false,
  contrastHelper: clampContrastHelper(prefs.contrastHelper),
  zoomPercent: clampZoomPercent(prefs.zoomPercent),
});

const ensureVisualStyleTag = () => {
  let styleEl = document.getElementById(VISUAL_STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = VISUAL_STYLE_ID;
    document.documentElement.appendChild(styleEl);
  }
  return styleEl;
};

const clearVisualEffects = () => {
  const styleEl = document.getElementById(VISUAL_STYLE_ID);
  if (styleEl) styleEl.remove();
};

const clearFocusMode = () => {
  if (A11Y_STATE.focusSyncRaf) {
    cancelAnimationFrame(A11Y_STATE.focusSyncRaf);
    A11Y_STATE.focusSyncRaf = null;
  }
  A11Y_STATE.focusMainEl = null;
  const styleEl = document.getElementById(FOCUS_STYLE_ID);
  if (styleEl) styleEl.remove();
  document.querySelectorAll("[data-a11y-focus-main],[data-a11y-focus-path]").forEach((el) => {
    el.removeAttribute("data-a11y-focus-main");
    el.removeAttribute("data-a11y-focus-path");
  });
};

const ensureFocusStyleTag = () => {
  let styleEl = document.getElementById(FOCUS_STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = FOCUS_STYLE_ID;
    document.documentElement.appendChild(styleEl);
  }
  return styleEl;
};

const clearFocusMarkers = () => {
  document.querySelectorAll("[data-a11y-focus-main],[data-a11y-focus-path]").forEach((el) => {
    el.removeAttribute("data-a11y-focus-main");
    el.removeAttribute("data-a11y-focus-path");
  });
};

const getIntersectionArea = (rect) => {
  const w = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
  const h = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
  return w * h;
};

const isValidFocusCandidate = (el) => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.id === VISUAL_ROOT_ID || el.id === "a11y-autopilot-root") return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 280 || rect.height < 140) return false;
  const textLen = (el.innerText || "").replace(/\s+/g, " ").trim().length;
  return textLen >= 80;
};

const scoreFocusCandidate = (el) => {
  const rect = el.getBoundingClientRect();
  const area = Math.max(1, rect.width * rect.height);
  const intersection = getIntersectionArea(rect);
  if (intersection <= 0) return -1;

  const visibleRatio = Math.min(1, intersection / area);
  const textLen = (el.innerText || "").replace(/\s+/g, " ").trim().length;
  const textScore = Math.min(1, textLen / 1400);
  const centerY = rect.top + rect.height / 2;
  const viewportCenterY = window.innerHeight / 2;
  const centerScore = Math.max(0, 1 - Math.abs(centerY - viewportCenterY) / window.innerHeight);
  const tag = el.tagName.toLowerCase();
  const semanticScore = tag === "article" ? 0.35 : tag === "main" ? 0.3 : tag === "section" ? 0.2 : 0;
  const areaScore = Math.min(1, Math.log10(area) / 6);

  return visibleRatio * 3.8 + centerScore * 1.9 + textScore * 1.5 + areaScore * 0.8 + semanticScore;
};

const getBestFocusMain = () => {
  const selectors = [
    "article",
    "main",
    "[role='main']",
    "[role='article']",
    "main section",
    "main article",
    "section",
    "#main",
    "#content",
    ".main",
    ".content",
    ".post",
    ".article",
    "[class*='content']",
    "[class*='article']",
    "[data-testid*='content']",
    "[data-testid*='article']",
    "[data-testid*='post']",
  ];
  const seen = new Set();
  const candidates = Array.from(document.querySelectorAll(selectors.join(","))).filter((el) => {
    if (seen.has(el)) return false;
    seen.add(el);
    return isValidFocusCandidate(el);
  });
  if (!candidates.length) {
    const topLevel = Array.from(document.body.children).filter((el) => {
      return isValidFocusCandidate(el);
    });
    if (!topLevel.length) return document.body;
    candidates.push(...topLevel);
  }
  if (!candidates.length) return document.body;

  let best = null;
  let bestScore = -1;
  let currentScore = -1;
  for (const el of candidates) {
    const score = scoreFocusCandidate(el);
    if (el === A11Y_STATE.focusMainEl) currentScore = score;
    if (score > bestScore) {
      best = el;
      bestScore = score;
    }
  }

  if (A11Y_STATE.focusMainEl && currentScore > 0 && bestScore > 0 && currentScore >= bestScore * 0.85) {
    return A11Y_STATE.focusMainEl;
  }
  return best || document.body;
};

const syncFocusModeToViewport = (force = false) => {
  if (!A11Y_STATE.settings.focusModeEnabled) return;
  const main = getBestFocusMain();
  if (!main || main === document.body) return;
  if (!force && main === A11Y_STATE.focusMainEl) return;

  clearFocusMarkers();
  main.setAttribute("data-a11y-focus-main", "1");
  let parent = main.parentElement;
  while (parent && parent !== document.body) {
    parent.setAttribute("data-a11y-focus-path", "1");
    parent = parent.parentElement;
  }
  A11Y_STATE.focusMainEl = main;
};

const scheduleFocusModeSync = () => {
  if (!A11Y_STATE.settings.focusModeEnabled) return;
  if (A11Y_STATE.focusSyncRaf) return;
  A11Y_STATE.focusSyncRaf = requestAnimationFrame(() => {
    A11Y_STATE.focusSyncRaf = null;
    syncFocusModeToViewport();
  });
};

const applyFocusMode = () => {
  clearFocusMarkers();
  A11Y_STATE.focusMainEl = null;

  const styleEl = ensureFocusStyleTag();
  styleEl.textContent = `
    body > *:not([data-a11y-focus-main]):not([data-a11y-focus-path]):not(#${VISUAL_ROOT_ID}):not(#a11y-autopilot-root) {
      opacity: 0.2 !important;
      transition: opacity 140ms ease;
      pointer-events: none !important;
      user-select: none !important;
    }
    body > header,
    body > nav,
    body > aside,
    body > footer,
    body > [role="banner"],
    body > [role="navigation"],
    body > [role="complementary"] {
      display: none !important;
    }
    [data-a11y-focus-main="1"] {
      opacity: 1 !important;
      pointer-events: auto !important;
      position: relative !important;
      z-index: 2147483000 !important;
      border-radius: 10px !important;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.35), 0 12px 28px rgba(0, 0, 0, 0.28) !important;
      background-clip: padding-box !important;
    }
    [data-a11y-focus-main="1"], [data-a11y-focus-main="1"] * {
      pointer-events: auto !important;
    }
  `;
  syncFocusModeToViewport(true);
};

const applyVisualPrefs = (rawPrefs) => {
  if (!A11Y_STATE.settings.visualEffectsEnabled) {
    clearVisualEffects();
    return;
  }
  const prefs = mergeVisualPrefs(rawPrefs);
  const styleEl = ensureVisualStyleTag();
  if (!prefs.enabled) {
    styleEl.textContent = "";
    return;
  }
  const underline = prefs.linksUnderline ? "underline" : "none";
  const focusOutline = prefs.focusRingEnabled ? `3px solid ${prefs.focusRingColor}` : "none";
  const focusShadow = prefs.focusRingEnabled ? `0 0 0 2px ${prefs.focusRingColor}55` : "none";

  let contrastCss = "";
  if (prefs.contrastHelper === "soft") {
    contrastCss = `
      body p, body li, body dt, body dd, body blockquote { line-height: 1.7 !important; }
    `;
  }
  if (prefs.contrastHelper === "strong") {
    contrastCss = `
      body { font-weight: 500 !important; letter-spacing: 0.01em !important; }
      body p, body li, body dt, body dd, body blockquote { line-height: 1.75 !important; }
    `;
  }

  const focusCss = prefs.keyboardFocus
    ? `
      :where(a, button, input, textarea, select, summary, [tabindex]):focus-visible {
        outline: ${focusOutline} !important;
        outline-offset: 2px !important;
        box-shadow: ${focusShadow} !important;
      }
    `
    : "";

  styleEl.textContent = `
    html, body {
      background: ${prefs.bodyBackground} !important;
    }
    body {
      zoom: ${prefs.zoomPercent}% !important;
      filter: contrast(${prefs.contrastScale}) !important;
    }
    body :where(*):not(img):not(video):not(canvas):not(svg):not(iframe) {
      background-color: ${prefs.bodyBackground} !important;
    }
    body, body :where(*, *::before, *::after) { color: ${prefs.bodyTextColor} !important; }
    a { text-decoration: ${underline} !important; }
    ${focusCss}
    ${contrastCss}
  `;
};

const getVisualRoot = () => document.getElementById(VISUAL_ROOT_ID);

const updateVisualPanelFields = (prefs) => {
  const root = getVisualRoot();
  if (!root?.shadowRoot) return;
  const panel = root.shadowRoot;
  panel.getElementById("v-enabled").checked = A11Y_STATE.settings.visualEffectsEnabled === true;
  panel.getElementById("v-body-bg").value = prefs.bodyBackground;
  panel.getElementById("v-text-color").value = prefs.bodyTextColor;
  panel.getElementById("v-focus-color").value = prefs.focusRingColor;
  panel.getElementById("v-link-underline").checked = prefs.linksUnderline;
  panel.getElementById("v-keyboard-focus").checked = prefs.keyboardFocus;
  panel.getElementById("v-focus-ring-enabled").checked = prefs.focusRingEnabled;
  panel.getElementById("v-contrast-helper").value = prefs.contrastHelper;
  panel.getElementById("v-zoom-range").value = String(prefs.zoomPercent);
  panel.getElementById("v-zoom-label").textContent = `${prefs.zoomPercent}%`;
};

const readVisualPanelFields = () => {
  const root = getVisualRoot();
  const panel = root?.shadowRoot;
  if (!panel) return mergeVisualPrefs(DEFAULT_VISUAL_SETTINGS);
  return mergeVisualPrefs({
    enabled: panel.getElementById("v-enabled").checked,
    contrastScale: A11Y_STATE.settings.visualPrefs?.contrastScale,
    bodyBackground: panel.getElementById("v-body-bg").value,
    bodyTextColor: panel.getElementById("v-text-color").value,
    focusRingColor: panel.getElementById("v-focus-color").value,
    linksUnderline: panel.getElementById("v-link-underline").checked,
    keyboardFocus: panel.getElementById("v-keyboard-focus").checked,
    focusRingEnabled: panel.getElementById("v-focus-ring-enabled").checked,
    contrastHelper: panel.getElementById("v-contrast-helper").value,
    zoomPercent: panel.getElementById("v-zoom-range").value,
  });
};

const saveVisualPrefs = async (prefs) => {
  const nextPrefs = mergeVisualPrefs(prefs);
  A11Y_STATE.settings.visualPrefs = nextPrefs;
  applyVisualPrefs(nextPrefs);
  const { enabled: _enabled, ...persistedPrefs } = nextPrefs;
  await chrome.storage.local.set({ visualPrefs: persistedPrefs });
};

const createVisualPanel = async () => {
  if (getVisualRoot()) return;
  const host = document.createElement("div");
  host.id = VISUAL_ROOT_ID;
  const shadow = host.attachShadow({ mode: "open" });

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .fab {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 2147483646;
        pointer-events: auto;
        border: 1px solid #0f172a;
        background: #0b3b5a;
        color: #ffffff;
        border-radius: 999px;
        padding: 10px 14px;
        font: 600 13px/1 ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif;
        cursor: pointer;
      }
      .panel {
        position: fixed;
        right: 20px;
        bottom: 68px;
        width: min(380px, calc(100vw - 24px));
        max-height: min(78vh, 680px);
        overflow: auto;
        z-index: 2147483646;
        pointer-events: auto;
        border: 1px solid #1f2937;
        background: #ffffff;
        color: #111827;
        border-radius: 12px;
        box-shadow: 0 14px 40px rgba(0,0,0,0.28);
        padding: 12px;
        display: none;
        font: 500 13px/1.4 ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif;
      }
      .panel.open { display: block; }
      .title { font-size: 15px; margin: 0 0 8px; }
      .header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
      .title { margin: 0; }
      .toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
      }
      .toggle-switch {
        position: relative;
        display: inline-block;
        width: 58px;
        height: 32px;
      }
      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .toggle-slider {
        position: absolute;
        inset: 0;
        cursor: pointer;
        border-radius: 999px;
        background: #334155;
        border: 1px solid #475569;
        transition: background 0.2s ease, box-shadow 0.2s ease;
      }
      .toggle-slider:before {
        content: "";
        position: absolute;
        left: 3px;
        top: 3px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.35);
        transition: transform 0.2s ease;
      }
      .toggle-switch input:checked + .toggle-slider {
        background: #22c55e;
        border-color: #22c55e;
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
      }
      .toggle-switch input:checked + .toggle-slider:before {
        transform: translateX(26px);
      }
      .toggle-text {
        font-size: 12px;
        font-weight: 600;
        color: #065f46;
      }
      .desc { font-size: 12px; margin: 0 0 10px; color: #374151; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      label { display: block; margin: 8px 0 4px; }
      input[type="color"], select {
        width: 100%;
        height: 34px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #f8fafc;
      }
      .check { display: flex; gap: 8px; align-items: center; margin: 8px 0; }
      .zoom-row {
        display: grid;
        grid-template-columns: auto auto 1fr auto auto auto;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
      }
      input[type="range"] { width: 100%; }
      .zoom-label {
        min-width: 48px;
        text-align: right;
        font-weight: 700;
      }
      .presets, .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
      button {
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 7px 10px;
        background: #f8fafc;
        color: #111827;
        cursor: pointer;
      }
      .primary { background: #0b3b5a; color: #fff; border-color: #0b3b5a; }
      .status { min-height: 14px; font-size: 12px; color: #065f46; margin-top: 6px; }
    </style>
    <button class="fab" id="v-open-btn" aria-label="Open visual settings">Visual Settings</button>
    <section class="panel" id="v-panel" aria-label="Visual accessibility settings" role="dialog">
      <div class="header">
        <h2 class="title">Visual Accessibility</h2>
        <label class="toggle">
          <span class="toggle-switch">
            <input id="v-enabled" type="checkbox" />
            <span class="toggle-slider"></span>
          </span>
          <span class="toggle-text">On</span>
        </label>
      </div>
      <p class="desc">Choose contrast and focus settings for better readability across websites.</p>

      <div class="grid">
        <div>
          <label for="v-body-bg">Body background</label>
          <input id="v-body-bg" type="color" />
        </div>
        <div>
          <label for="v-text-color">Body text color</label>
          <input id="v-text-color" type="color" />
        </div>
        <div>
          <label for="v-focus-color">Focus ring color</label>
          <input id="v-focus-color" type="color" />
        </div>
        <div>
          <label for="v-contrast-helper">Text contrast helper</label>
          <select id="v-contrast-helper">
            <option value="none">None</option>
            <option value="soft">Soft readability</option>
            <option value="strong">Strong readability</option>
          </select>
        </div>
      </div>

      <label class="check"><input id="v-link-underline" type="checkbox" /> Underline links</label>
      <label class="check"><input id="v-keyboard-focus" type="checkbox" /> Enhance keyboard focus visibility</label>
      <label class="check"><input id="v-focus-ring-enabled" type="checkbox" /> Show custom focus ring</label>
      <div class="zoom-row">
        <label for="v-zoom-range">Zoom</label>
        <button id="v-zoom-out" type="button">-</button>
        <input id="v-zoom-range" type="range" min="50" max="200" step="5" />
        <button id="v-zoom-in" type="button">+</button>
        <span class="zoom-label" id="v-zoom-label">100%</span>
        <button id="v-zoom-step" type="button">Reset 100%</button>
      </div>

      <div class="presets">
        <button id="v-preset-dark" type="button">High Contrast Dark</button>
        <button id="v-preset-light" type="button">High Contrast Light</button>
        <button id="v-preset-cream" type="button">Cream Paper</button>
        <button id="v-preset-blue-yellow" type="button">Blue/Yellow Contrast</button>
      </div>

      <div class="actions">
        <button id="v-reset" type="button">Reset</button>
        <button id="v-close" type="button">Close</button>
      </div>
      <div class="status" id="v-status"></div>
    </section>
  `;

  document.documentElement.appendChild(host);
  const panel = shadow.getElementById("v-panel");
  const status = shadow.getElementById("v-status");
  const openBtn = shadow.getElementById("v-open-btn");
  let autoSaveTimer = null;

  const showStatus = (text) => {
    status.textContent = text;
    setTimeout(() => {
      if (status.textContent === text) status.textContent = "";
    }, 1500);
  };

  openBtn.addEventListener("click", async () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) {
      const stored = await chrome.storage.local.get({ visualPrefs: DEFAULT_VISUAL_SETTINGS });
      const prefs = mergeVisualPrefs({
        ...stored.visualPrefs,
        enabled: A11Y_STATE.settings.visualEffectsEnabled === true,
      });
      updateVisualPanelFields(prefs);
      applyVisualPrefs(prefs);
      A11Y_STATE.settings.visualPrefs = prefs;
    }
  });

  shadow.getElementById("v-close").addEventListener("click", () => {
    panel.classList.remove("open");
  });

  const scheduleAutoSave = () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      const prefs = readVisualPanelFields();
      await saveVisualPrefs(prefs);
      showStatus("Auto-saved");
    }, 120);
  };

  shadow.getElementById("v-reset").addEventListener("click", async () => {
    const current = readVisualPanelFields();
    const prefs = mergeVisualPrefs({ ...DEFAULT_VISUAL_SETTINGS, enabled: current.enabled });
    A11Y_STATE.settings.visualEffectsEnabled = prefs.enabled === true;
    updateVisualPanelFields(prefs);
    await saveVisualPrefs(prefs);
    showStatus("Reset to default");
  });

  const applyPreset = async (preset) => {
    const current = readVisualPanelFields();
    const prefs = mergeVisualPrefs({ ...preset, enabled: current.enabled });
    updateVisualPanelFields(prefs);
    await saveVisualPrefs(prefs);
    showStatus("Preset applied");
  };

  shadow.getElementById("v-preset-dark").addEventListener("click", () => applyPreset(VISUAL_PRESETS.highContrastDark));
  shadow.getElementById("v-preset-light").addEventListener("click", () => applyPreset(VISUAL_PRESETS.highContrastLight));
  shadow.getElementById("v-preset-cream").addEventListener("click", () => applyPreset(VISUAL_PRESETS.creamPaper));
  shadow.getElementById("v-preset-blue-yellow").addEventListener("click", () => applyPreset(VISUAL_PRESETS.blueYellowContrast));

  shadow.getElementById("v-zoom-out").addEventListener("click", () => {
    const zoomEl = shadow.getElementById("v-zoom-range");
    const next = clampZoomPercent(Number(zoomEl.value) - 5);
    zoomEl.value = String(next);
    shadow.getElementById("v-zoom-label").textContent = `${next}%`;
    applyVisualPrefs(readVisualPanelFields());
    scheduleAutoSave();
  });

  shadow.getElementById("v-zoom-in").addEventListener("click", () => {
    const zoomEl = shadow.getElementById("v-zoom-range");
    const next = clampZoomPercent(Number(zoomEl.value) + 5);
    zoomEl.value = String(next);
    shadow.getElementById("v-zoom-label").textContent = `${next}%`;
    applyVisualPrefs(readVisualPanelFields());
    scheduleAutoSave();
  });

  shadow.getElementById("v-zoom-step").addEventListener("click", () => {
    shadow.getElementById("v-zoom-range").value = "100";
    shadow.getElementById("v-zoom-label").textContent = "100%";
    applyVisualPrefs(readVisualPanelFields());
    scheduleAutoSave();
  });

  const livePreviewIds = [
    "v-enabled",
    "v-body-bg",
    "v-text-color",
    "v-focus-color",
    "v-link-underline",
    "v-keyboard-focus",
    "v-focus-ring-enabled",
    "v-contrast-helper",
    "v-zoom-range",
  ];
  livePreviewIds.forEach((id) => {
    const eventName = id === "v-contrast-helper" ? "change" : "input";
    shadow.getElementById(id).addEventListener(eventName, () => {
      if (id === "v-enabled") {
        A11Y_STATE.settings.visualEffectsEnabled = shadow.getElementById("v-enabled").checked === true;
      }
      if (id === "v-zoom-range") {
        const zoomNow = clampZoomPercent(shadow.getElementById("v-zoom-range").value);
        shadow.getElementById("v-zoom-label").textContent = `${zoomNow}%`;
      }
      const nextPrefs = readVisualPanelFields();
      A11Y_STATE.settings.visualPrefs = nextPrefs;
      applyVisualPrefs(nextPrefs);
      scheduleAutoSave();
    });
  });

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!panel.classList.contains("open")) return;
      if (event.composedPath().includes(host)) return;
      panel.classList.remove("open");
    },
    true
  );

  const stored = await chrome.storage.local.get({ visualPrefs: DEFAULT_VISUAL_SETTINGS });
  const prefs = mergeVisualPrefs({
    ...stored.visualPrefs,
    enabled: A11Y_STATE.settings.visualEffectsEnabled === true,
  });
  updateVisualPanelFields(prefs);
  applyVisualPrefs(prefs);
  A11Y_STATE.settings.visualPrefs = prefs;
};

const initVisualA11yFeatures = async () => {
  const stored = await chrome.storage.local.get({ visualPrefs: DEFAULT_VISUAL_SETTINGS });
  const prefs = mergeVisualPrefs({
    ...stored.visualPrefs,
    enabled: A11Y_STATE.settings.visualEffectsEnabled === true,
  });
  A11Y_STATE.settings.visualPrefs = prefs;
  applyVisualPrefs(prefs);
  await createVisualPanel();
};

const DANGEROUS_KEYWORDS = ["delete", "remove", "pay", "submit", "purchase"];
const STOP_WORDS = ["stop", "cancel", "pause"];
const STOP_PHRASES = ["stop reading", "pause reading", "stop speaking", "pause speaking"];
const RESUME_PHRASES = [
  "continue",
  "continue reading",
  "resume",
  "resume reading",
  "keep going",
  "keep reading",
  "go on",
  "carry on",
  "keep talking",
  "keep speaking",
];
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
const ACTION_QUERY = ACTION_SELECTORS.join(",");
const ACTION_MAP_STALE_AFTER_MS = 4000;
const SEARCH_HINTS = ["search", "find", "query", "q", "keyword"];

const COMMAND_HINTS = [
  "search <query>",
  "click <target>",
  "open <target>",
  "type <value> into <field>",
  "scroll down|up [amount]",
  "go back",
  "reload",
  "focus next",
  "focus previous",
  "summarize this",
  "summarize page",
  "summarize article",
  "explain this",
  "explain page",
  "explain article",
  "summarize the page",
  "summarize the article",
  "explain the page",
  "explain the article",
  "stop reading",
  "continue reading",
  "resume reading",
  "label mode on|off",
  "focus mode on|off",
  "open <number>",
  "submit",
  "agent mode on|off",
  "stop",
  "help me navigate",
  "guide me",
  "what can i do here",
  "what is this page",
  "page guide",
];

const COMMON_COMMANDS = [
  "scroll down",
  "scroll up",
  "summarize",
  "summarize this",
  "summarize page",
  "summarize article",
  "summary",
  "explain",
  "explain this",
  "explain page",
  "explain article",
  "summarize the page",
  "summarize the article",
  "explain the page",
  "explain the article",
  "go back",
  "back",
  "reload",
  "refresh",
  "refresh page",
  "focus next",
  "focus previous",
  "label mode on",
  "label mode off",
  "focus mode on",
  "focus mode off",
  "agent mode on",
  "agent mode off",
  "open 1",
  "open 2",
  "open 3",
  "open 4",
  "open 5",
  "open 6",
  "open 7",
  "open 8",
  "open 9",
  "stop",
  "stop reading",
  "pause reading",
  "cancel",
  "pause",
  "continue",
  "continue reading",
  "resume",
  "resume reading",
  "keep reading",
  "submit",
  "help me navigate",
  "guide me",
  "what can i do here",
  "what is this page",
  "page guide",
  "navigate this page",
  "help me use this page",
  "help me understand this page",
  "help",
];

const KEYWORD_TOKENS = [
  "search",
  "find",
  "query",
  "scroll",
  "down",
  "up",
  "summarize",
  "summary",
  "explain",
  "this",
  "page",
  "article",
  "go",
  "back",
  "reload",
  "refresh",
  "focus",
  "next",
  "previous",
  "label",
  "mode",
  "on",
  "off",
  "agent",
  "open",
  "click",
  "type",
  "into",
  "submit",
  "summary",
  "read",
  "reading",
  "stop",
  "cancel",
  "pause",
  "continue",
  "help",
  "guide",
  "navigate",
  "resume",
  "keep",
  "number",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

const HOMOPHONE_MAP = new Map([
  ["school", "scroll"],
  ["skroll", "scroll"],
  ["skrol", "scroll"],
  ["scoll", "scroll"],
  ["scrol", "scroll"],
  ["scrolll", "scroll"],
  ["scrolling", "scroll"],
  ["sumarize", "summarize"],
  ["summarise", "summarize"],
  ["summery", "summary"],
  ["summury", "summary"],
  ["sumerize", "summarize"],
  ["summarise", "summarize"],
  ["summarize", "summarize"],
  ["explane", "explain"],
  ["explain", "explain"],
  ["explan", "explain"],
  ["explaying", "explain"],
  ["bak", "back"],
  ["backk", "back"],
  ["relode", "reload"],
  ["reloade", "reload"],
  ["refesh", "refresh"],
  ["refrsh", "refresh"],
  ["labal", "label"],
  ["lable", "label"],
  ["mod", "mode"],
  ["agnt", "agent"],
  ["opn", "open"],
  ["clik", "click"],
  ["clic", "click"],
  ["type", "type"],
  ["tyep", "type"],
  ["teep", "type"],
  ["untill", "until"],
  ["won", "one"],
  ["to", "two"],
  ["too", "two"],
  ["tree", "three"],
  ["for", "four"],
  ["fore", "four"],
  ["ate", "eight"],
  ["night", "nine"],
]);

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
      max-height: min(78vh, 720px);
      background: #0b0f14;
      color: #f5f7fa;
      border: 2px solid #2f80ed;
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.35);
      padding: 12px;
      display: none;
      pointer-events: auto;
      overflow-y: auto;
    }
    .palette.dragging {
      cursor: grabbing;
      user-select: none;
    }
    .drag-handle {
      display: flex;
      align-items: center;
      justify-content: space-between;
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
    .close-btn {
      margin-left: auto;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: 1px solid #475569;
      background: #111827;
      color: #e2e8f0;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .close-btn:hover {
      border-color: #ef4444;
      color: #fecaca;
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
    .help-btn {
      margin-top: 8px;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid #38bdf8;
      background: #0ea5e9;
      color: #04121f;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .quick-actions {
      margin-top: 8px;
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .focus-toggle {
      border: 1px solid #334155;
      background: #0f172a;
      color: #e2e8f0;
      padding: 5px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .focus-toggle.active {
      border-color: #22c55e;
      background: #052e16;
      color: #bbf7d0;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
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
    .summary {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid #334155;
      border-radius: 10px;
      background: #0f172a;
      display: none;
      font-size: 12px;
      color: #e2e8f0;
    }
    .summary-controls {
      margin-top: 8px;
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }
    .summary-controls button {
      border: 1px solid #475569;
      background: #111827;
      color: #e2e8f0;
      padding: 4px 8px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
    }
    .summary ul {
      margin: 6px 0 0 16px;
      padding: 0;
    }
    .debug {
      margin-top: 8px;
      padding: 8px;
      border: 1px dashed #475569;
      border-radius: 8px;
      background: #0b1220;
      color: #a5b4fc;
      font-size: 11px;
      display: none;
      white-space: pre-wrap;
    }
  `;

  shadow.innerHTML = `
    <div id="wrap">
      <div class="palette" role="dialog" aria-modal="true" aria-label="A11y Autopilot">
        <div class="drag-handle">
          <span>Drag</span>
          <button class="close-btn" title="Close">×</button>
        </div>
        <div class="row">
          <input class="cmd-input" type="text" placeholder="Type a command..." />
          <button class="mic-btn" title="Voice input">Mic</button>
        </div>
        <div class="hint">Try: click checkout, scroll down, label mode on, open 3</div>
        <button class="help-btn" type="button">Help me navigate</button>
        <div class="quick-actions">
          <button class="focus-toggle">Focus Mode: OFF</button>
        </div>
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
        <div class="summary">
          <div class="summary-content"></div>
          <div class="summary-controls">
            <button class="summary-continue" type="button">Continue</button>
          </div>
        </div>
        <div class="debug"></div>
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
  A11Y_STATE.helpBtn = shadow.querySelector(".help-btn");
  A11Y_STATE.metricsEl = shadow.querySelector(".metrics");
  A11Y_STATE.toastEl = shadow.querySelector(".toast");
  A11Y_STATE.summaryEl = shadow.querySelector(".summary");
  A11Y_STATE.summaryContentEl = shadow.querySelector(".summary-content");
  A11Y_STATE.summaryContinueBtn = shadow.querySelector(".summary-continue");
  A11Y_STATE.debugEl = shadow.querySelector(".debug");
  A11Y_STATE.labelsEl = shadow.querySelector(".labels");
  A11Y_STATE.micBtn = shadow.querySelector(".mic-btn");
  A11Y_STATE.paletteEl = shadow.querySelector(".palette");
  A11Y_STATE.agentToggleBtn = shadow.querySelector(".agent-toggle");
  A11Y_STATE.agentStatusEl = shadow.querySelector(".agent-status");
  A11Y_STATE.agentTranscriptEl = shadow.querySelector(".agent-transcript");
  A11Y_STATE.agentStepEl = shadow.querySelector(".agent-step");
  A11Y_STATE.agentStopBtn = shadow.querySelector(".agent-stop");
  A11Y_STATE.focusToggleBtn = shadow.querySelector(".focus-toggle");
  A11Y_STATE.closeBtn = shadow.querySelector(".close-btn");

  A11Y_STATE.inputEl.addEventListener("keydown", onInputKeyDown);
  A11Y_STATE.helpBtn.addEventListener("click", showPageGuide);
  A11Y_STATE.micBtn.addEventListener("click", toggleVoice);
  A11Y_STATE.agentToggleBtn.addEventListener("click", toggleAgentMode);
  A11Y_STATE.agentStopBtn.addEventListener("click", interruptAgent);
  A11Y_STATE.focusToggleBtn.addEventListener("click", toggleFocusMode);
  A11Y_STATE.paletteEl.addEventListener("mousedown", startDrag);
  A11Y_STATE.closeBtn.addEventListener("click", hidePalette);
  if (A11Y_STATE.summaryContinueBtn) {
    A11Y_STATE.summaryContinueBtn.addEventListener("click", () => {
      if (!A11Y_STATE.settings.textToSpeechEnabled) {
        toast("Enable text to speech in settings");
        return;
      }
      if (resumeSpeech()) {
        resumeAgentIfPaused();
        return;
      }
      toast("Nothing to resume");
    });
  }
  updateFocusToggleUi();
};

const loadSettings = async () => {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  A11Y_STATE.settings = { ...DEFAULT_SETTINGS, ...stored };
  // Per-page default: visual effects always start OFF on new page loads.
  A11Y_STATE.settings.visualEffectsEnabled = false;
  A11Y_STATE.settings.focusModeEnabled = false;
  A11Y_STATE.settings.visualPrefs = mergeVisualPrefs({
    ...(stored.visualPrefs || DEFAULT_VISUAL_SETTINGS),
    enabled: A11Y_STATE.settings.visualEffectsEnabled === true,
  });
  applyVisualPrefs(A11Y_STATE.settings.visualPrefs);
  clearFocusMode();
};

const showPalette = async () => {
  ensureUi();
  await loadSettings();
  A11Y_STATE.paletteOpen = true;
  A11Y_STATE.shadow.querySelector(".palette").style.display = "block";
  A11Y_STATE.shadow.querySelector(".agent-panel").style.display =
    A11Y_STATE.settings.agentModeEnabled ? "block" : "none";
  if (A11Y_STATE.summaryEl) A11Y_STATE.summaryEl.style.display = "none";
  A11Y_STATE.agent.enabled = A11Y_STATE.settings.agentModeEnabled;
  updateAgentUi();
  updateFocusToggleUi();
  A11Y_STATE.inputEl.value = "";
  A11Y_STATE.inputEl.focus();
  A11Y_STATE.metrics.sessionStart = Date.now();
  A11Y_STATE.metrics.steps = 0;
  A11Y_STATE.metrics.ambiguity = 0;
  updateMetrics();
  clearList();
  buildActionMap({ force: true });
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

const updateFocusToggleUi = () => {
  if (!A11Y_STATE.focusToggleBtn) return;
  A11Y_STATE.focusToggleBtn.textContent = A11Y_STATE.settings.focusModeEnabled ? "Focus Mode: ON" : "Focus Mode: OFF";
  A11Y_STATE.focusToggleBtn.classList.toggle("active", A11Y_STATE.settings.focusModeEnabled);
};

const toggleFocusMode = () => {
  A11Y_STATE.settings.focusModeEnabled = !A11Y_STATE.settings.focusModeEnabled;
  if (A11Y_STATE.settings.focusModeEnabled) {
    applyFocusMode();
    toast("Focus mode on");
  } else {
    clearFocusMode();
    toast("Focus mode off");
  }
  updateFocusToggleUi();
};

const toggleLabelMode = () => {
  A11Y_STATE.labelMode = !A11Y_STATE.labelMode;
  if (A11Y_STATE.labelMode) {
    buildActionMap({ force: true });
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
      markActionMapStale();
      if (A11Y_STATE.labelMode) scheduleActionMapRefresh();
      if (A11Y_STATE.settings.focusModeEnabled) scheduleFocusModeSync();
    }, 400);
  });
  A11Y_STATE.observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
  });
};

const buildPageContext = () => {
  const sliceText = (text, max = 120) => (text || "").replace(/\s+/g, " ").trim().slice(0, max);
  const pickText = (el) => sliceText(el?.innerText || el?.textContent || "");
  const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
    .map((h) => pickText(h))
    .filter(Boolean)
    .slice(0, 10);
  const buttons = Array.from(document.querySelectorAll("button, a, [role='button'], [role='link']"))
    .map((b) => sliceText(b.getAttribute("aria-label") || b.innerText || b.textContent || ""))
    .filter(Boolean)
    .slice(0, 15);
  const inputs = Array.from(document.querySelectorAll("input, textarea, select"))
    .map((i) =>
      sliceText(
        i.getAttribute("placeholder") ||
          i.getAttribute("aria-label") ||
          i.getAttribute("name") ||
          i.getAttribute("id") ||
          ""
      )
    )
    .filter(Boolean)
    .slice(0, 12);
  return {
    title: sliceText(document.title, 140),
    url: location.href,
    headings,
    buttons,
    inputs,
    keywords: extractPageKeywords(),
  };
};

const prefetchPageGuide = async () => {
  const backendUrl = (A11Y_STATE.settings.backendUrl || "").trim();
  if (!backendUrl) return;
  const url = location.href;
  if (A11Y_STATE.pageGuideUrl === url && A11Y_STATE.pageGuide) return;
  const payload = {
    url,
    pageContext: A11Y_STATE.pageContext || buildPageContext(),
  };
  try {
    const guide = await guideWithAi(backendUrl, payload);
    if (guide) {
      A11Y_STATE.pageGuide = guide;
      A11Y_STATE.pageGuideAt = Date.now();
      A11Y_STATE.pageGuideUrl = url;
    }
  } catch (_) {}
};

const initPageContext = () => {
  if (A11Y_STATE.pageContextInit) return;
  A11Y_STATE.pageContextInit = true;
  try {
    A11Y_STATE.pageContext = buildPageContext();
  } catch (_) {
    A11Y_STATE.pageContext = null;
  }
  prefetchPageGuide();
};

const stopObserver = () => {
  if (!A11Y_STATE.observer) return;
  A11Y_STATE.observer.disconnect();
  A11Y_STATE.observer = null;
};

const markActionMapStale = () => {
  A11Y_STATE.actionMapStale = true;
};

const scheduleActionMapRefresh = () => {
  if (A11Y_STATE.actionMapBuildPending) return;
  A11Y_STATE.actionMapBuildPending = true;
  const run = () => {
    A11Y_STATE.actionMapBuildPending = false;
    buildActionMap();
    if (A11Y_STATE.labelMode) renderLabels();
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 600 });
  } else {
    setTimeout(run, 250);
  }
};

const shouldRebuildActionMap = (force) => {
  if (force) return true;
  if (A11Y_STATE.actionMapStale) return true;
  if (!A11Y_STATE.actionMap.length) return true;
  return Date.now() - A11Y_STATE.lastActionMapBuildAt > ACTION_MAP_STALE_AFTER_MS;
};

const buildActionMap = ({ force = false } = {}) => {
  if (!shouldRebuildActionMap(force)) return;
  const elements = Array.from(document.querySelectorAll(ACTION_QUERY));
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
  A11Y_STATE.actionMapStale = false;
  A11Y_STATE.lastActionMapBuildAt = Date.now();
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
  debugLog(`input="${input}"`);
  A11Y_STATE.metrics.steps += 1;
  const parsed = parseCommand(input);
  if (!parsed) {
    debugLog("parse=none");
    answerQuestion(input);
    return;
  }
  debugLog(`parse=${parsed.intent || "unknown"}`);
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
  if (parsed.intent === "TOGGLE_FOCUS_MODE") {
    if (parsed.enabled !== A11Y_STATE.settings.focusModeEnabled) toggleFocusMode();
    return;
  }
  if (parsed.intent === "PAGE_GUIDE") {
    showPageGuide();
    return;
  }
  if (parsed.intent === "SUMMARIZE") {
    debugLog("summarize: start");
    summarizePage("ARTICLE_MAIN");
    return;
  }
  if (parsed.intent === "STOP") {
    const paused = pauseSpeech();
    if (paused) {
      toast("Reading paused.");
      if (!A11Y_STATE.agent.enabled) return;
    }
    interruptAgent();
    return;
  }
  if (parsed.intent === "TTS_RESUME") {
    if (!A11Y_STATE.settings.textToSpeechEnabled) {
      toast("Enable text to speech in settings");
      return;
    }
    if (resumeSpeech()) {
      resumeAgentIfPaused();
      toast("Reading resumed.");
      return;
    }
    toast("Nothing to resume");
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
  if (parsed.intent === "SEARCH") {
    handleSearch(parsed.query, input);
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
  if (text === "focus mode on") return { intent: "TOGGLE_FOCUS_MODE", enabled: true };
  if (text === "focus mode off") return { intent: "TOGGLE_FOCUS_MODE", enabled: false };
  const common = parseCommonCommand(text);
  if (common) return common;
  if (STOP_PHRASES.includes(text)) return { intent: "STOP" };
  if (RESUME_PHRASES.includes(text)) return { intent: "TTS_RESUME" };
  if (STOP_WORDS.includes(text)) return { intent: "STOP" };
  const openNumber = text.match(/^open\s+(\d+)$/);
  if (openNumber) return { intent: "OPEN_NUMBER", n: Number(openNumber[1]) };
  const scroll = text.match(/^scroll\s+(down|up)(?:\s+(\d+))?$/);
  if (scroll) return { intent: "SCROLL", direction: scroll[1].toUpperCase(), amountPx: scroll[2] ? Number(scroll[2]) : undefined };
  if (text === "focus next") return { intent: "FOCUS_NEXT" };
  if (text === "focus previous") return { intent: "FOCUS_PREV" };
  if (text === "submit") return { intent: "SUBMIT" };
  if (text === "help me navigate" || text === "guide me" || text === "what can i do here" || text === "what is this page" || text === "page guide") {
    return { intent: "PAGE_GUIDE" };
  }
  const summarizeRe = /^(summarize|summary|explain)(\s+(this|the))?(\s+(page|article))?$/;
  if (summarizeRe.test(text)) return { intent: "SUMMARIZE" };
  const click = text.match(/^(click|open)\s+(.+)$/);
  if (click) return { intent: "CLICK", targetText: click[2] };
  const search = input.match(/^search\s+(?:for\s+)?(.+)$/i);
  if (search) return { intent: "SEARCH", query: search[1].trim() };
  const type = input.match(/^type\s+(.+)\s+into\s+(.+)$/i);
  if (type) return { intent: "TYPE", value: type[1], fieldHint: type[2] };
  return null;
};

const parseCommonCommand = (text) => {
  if (
    [
      "summarize",
      "summarize this",
      "summarize page",
      "summarize the page",
      "summarize article",
      "summarize the article",
      "summary",
      "explain",
      "explain this",
      "explain page",
      "explain the page",
      "explain article",
      "explain the article",
    ].includes(text)
  ) {
    return { intent: "SUMMARIZE" };
  }
  if (
    [
      "help me navigate",
      "guide me",
      "what can i do here",
      "what is this page",
      "page guide",
      "navigate this page",
      "help me use this page",
      "help me understand this page",
      "help",
    ].includes(text)
  ) {
    return { intent: "PAGE_GUIDE" };
  }
  if (RESUME_PHRASES.includes(text)) return { intent: "TTS_RESUME" };
  if (text === "go back" || text === "back") return { intent: "NAV_BACK" };
  if (text === "reload" || text === "refresh" || text === "refresh page") return { intent: "RELOAD" };
  if (text === "focus next") return { intent: "FOCUS_NEXT" };
  if (text === "focus previous") return { intent: "FOCUS_PREV" };
  if (text === "submit") return { intent: "SUBMIT" };
  if (text === "label mode on") return { intent: "TOGGLE_LABEL_MODE", enabled: true };
  if (text === "label mode off") return { intent: "TOGGLE_LABEL_MODE", enabled: false };
  if (text === "agent mode on") return { intent: "TOGGLE_AGENT_MODE", enabled: true };
  if (text === "agent mode off") return { intent: "TOGGLE_AGENT_MODE", enabled: false };
  if (text === "focus mode on") return { intent: "TOGGLE_FOCUS_MODE", enabled: true };
  if (text === "focus mode off") return { intent: "TOGGLE_FOCUS_MODE", enabled: false };
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

const isSearchHint = (text) => {
  if (!text) return false;
  const norm = text.toLowerCase();
  return SEARCH_HINTS.some((hint) => norm.includes(hint));
};

const scoreSearchField = (el, info) => {
  if (!el || !info) return 0;
  let score = 0;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input") score += 0.1;
  if (tag === "textarea") score += 0.05;
  const type = (el.getAttribute("type") || "").toLowerCase();
  if (type === "search") score += 1;
  if (type === "text") score += 0.2;
  if ((el.getAttribute("role") || "").toLowerCase() === "searchbox") score += 0.9;
  if ((el.getAttribute("inputmode") || "").toLowerCase() === "search") score += 0.4;
  const labelBits = [
    info.label,
    el.getAttribute("placeholder"),
    el.getAttribute("aria-label"),
    el.getAttribute("name"),
    el.getAttribute("id"),
    el.getAttribute("title"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (labelBits.includes("search")) score += 0.6;
  if (labelBits.includes("find")) score += 0.3;
  if (labelBits.includes("query")) score += 0.3;
  if (labelBits.includes("q")) score += 0.1;
  const form = el.closest("form");
  if (form) {
    const role = (form.getAttribute("role") || "").toLowerCase();
    const action = (form.getAttribute("action") || "").toLowerCase();
    if (role === "search") score += 0.4;
    if (action.includes("search")) score += 0.3;
  }
  if (info.isVisible) score += 0.1;
  return score;
};

const getSearchFieldCandidates = () => {
  buildActionMap();
  const results = [];
  for (const item of A11Y_STATE.actionMap) {
    if (!["input", "textarea", "select"].includes(item.role)) continue;
    const ref = A11Y_STATE.actionElementsById.get(item.id);
    if (!ref?.element) continue;
    const score = scoreSearchField(ref.element, item);
    if (score <= 0) continue;
    results.push({ element: ref.element, info: item, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 9);
};

const submitSearchField = (el) => {
  if (!el) return;
  const form = el.closest("form");
  if (form) {
    form.requestSubmit?.() || form.submit?.();
    return;
  }
  pressKey("ENTER");
};

const handleSearch = (query, rawCommand) => {
  if (!query) {
    toast("No search query provided");
    return;
  }
  const candidates = getSearchFieldCandidates();
  if (!candidates.length) {
    handleType(query, "search", rawCommand);
    pressKey("ENTER");
    return;
  }
  const [top, second] = candidates;
  if (top.score >= 0.7 && (!second || top.score - second.score >= 0.1)) {
    typeInto(top.element, query);
    submitSearchField(top.element);
    toast("Search submitted");
    return;
  }
  showAmbiguity(candidates, (chosen) => {
    typeInto(chosen.element, query);
    submitSearchField(chosen.element);
    toast("Search submitted");
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

const levenshtein = (a, b) => {
  if (a === b) return 0;
  const alen = a.length;
  const blen = b.length;
  if (!alen) return blen;
  if (!blen) return alen;
  const dp = Array.from({ length: alen + 1 }, () => new Array(blen + 1).fill(0));
  for (let i = 0; i <= alen; i += 1) dp[i][0] = i;
  for (let j = 0; j <= blen; j += 1) dp[0][j] = j;
  for (let i = 1; i <= alen; i += 1) {
    const ca = a[i - 1];
    for (let j = 1; j <= blen; j += 1) {
      const cb = b[j - 1];
      const cost = ca === cb ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[alen][blen];
};

const normalizeTokens = (tokens) =>
  tokens
    .map((raw) => {
      const t = normalize(raw);
      if (!t) return "";
      if (HOMOPHONE_MAP.has(t)) return HOMOPHONE_MAP.get(t);
      let best = t;
      let bestScore = 3;
      for (const kw of KEYWORD_TOKENS) {
        const dist = levenshtein(t, kw);
        if (dist < bestScore) {
          bestScore = dist;
          best = kw;
        }
        if (bestScore === 0) break;
      }
      return bestScore <= 2 ? best : t;
    })
    .filter(Boolean);

const tokensFromText = (text) =>
  normalizeTokens(text.split(/\s+/)).map((t) => t.toLowerCase()).filter(Boolean);

const hasAny = (set, words) => words.some((w) => set.has(w));

const deriveCommandFromTokens = (tokens) => {
  if (!tokens.length) return null;
  const set = new Set(tokens);

  if (hasAny(set, ["stop", "cancel", "pause"])) return "stop";
  if (hasAny(set, ["continue", "resume"]) && hasAny(set, ["read", "reading", "summary"])) return "continue reading";
  if (hasAny(set, ["continue", "resume", "keep"]) && set.has("reading")) return "continue reading";
  if (hasAny(set, ["continue", "resume", "keep"])) return "continue reading";

  if (set.has("scroll")) {
    if (set.has("up")) return "scroll up";
    if (set.has("down")) return "scroll down";
    return "scroll down";
  }

  if (hasAny(set, ["summarize", "summary", "explain"])) return "summarize this";

  if (hasAny(set, ["reload", "refresh"])) return "reload";

  if (hasAny(set, ["back"]) || (set.has("go") && set.has("back"))) return "go back";

  if (set.has("focus")) {
    if (set.has("mode")) {
      if (set.has("on")) return "focus mode on";
      if (set.has("off")) return "focus mode off";
    }
    if (set.has("next")) return "focus next";
    if (set.has("previous")) return "focus previous";
  }

  if (set.has("label") && set.has("mode")) {
    if (set.has("on")) return "label mode on";
    if (set.has("off")) return "label mode off";
  }

  if (set.has("agent") && set.has("mode")) {
    if (set.has("on")) return "agent mode on";
    if (set.has("off")) return "agent mode off";
  }

  if (set.has("submit")) return "submit";

  if (set.has("open")) {
    for (const [word, n] of Object.entries(OPTION_WORDS)) {
      if (set.has(word)) return `open ${n}`;
    }
  }

  return null;
};

const matchCommonCommand = (utterance) => {
  const norm = normalize(utterance);
  if (!norm) return null;
  const exact = COMMON_COMMANDS.find((cmd) => cmd === norm);
  if (exact) return { command: exact, confidence: 0.95 };
  let best = null;
  let bestScore = 0;
  for (const cmd of COMMON_COMMANDS) {
    const dist = levenshtein(norm, cmd);
    const maxLen = Math.max(norm.length, cmd.length) || 1;
    const score = 1 - dist / maxLen;
    if (score > bestScore) {
      bestScore = score;
      best = cmd;
    }
  }
  if (best && bestScore >= 0.78) return { command: best, confidence: bestScore };
  return null;
};

const mapCommonSynonyms = (text) => {
  const norm = normalize(text);
  if (!norm) return null;
  if (["stop reading", "pause reading", "stop speaking", "pause speaking"].includes(norm)) return "stop";
  if (["continue", "continue reading", "resume", "resume reading", "keep reading", "keep going", "go on", "carry on"].includes(norm)) {
    return "continue reading";
  }
  if (["reload", "refresh", "refresh page"].includes(norm)) return "reload";
  if (["back", "go back", "go backward"].includes(norm)) return "go back";
  if (
    [
      "help",
      "help me",
      "help me navigate",
      "guide me",
      "navigate this page",
      "help me use this page",
      "help me understand this page",
      "what can i do here",
      "what is this page",
      "page guide",
    ].includes(norm)
  ) {
    return "help me navigate";
  }
  if (
    [
      "summarize",
      "summary",
      "summarize this",
      "summarize page",
      "summarize the page",
      "summarize article",
      "summarize the article",
      "explain",
      "explain this",
      "explain page",
      "explain the page",
      "explain article",
      "explain the article",
    ].includes(norm)
  ) {
    return "summarize this";
  }
  return null;
};

const normalizeSpeechLocally = (utterance) => {
  const cleaned = normalize(utterance);
  if (!cleaned) return { command: utterance, confidence: 0 };
  const common = matchCommonCommand(cleaned);
  if (common) return common;

  const tokens = normalizeTokens(cleaned.split(/\s+/));
  const fixed = tokens.join(" ").trim();
  if (!fixed) return { command: utterance, confidence: 0 };

  const mapped = mapCommonSynonyms(fixed);
  if (mapped) return { command: mapped, confidence: 0.8 };

  const derived = deriveCommandFromTokens(tokens);
  if (derived) return { command: derived, confidence: 0.75 };

  const matchAfterFix = matchCommonCommand(fixed);
  if (matchAfterFix) return matchAfterFix;

  if (fixed.startsWith("scroll ") || fixed === "scroll down" || fixed === "scroll up") {
    return { command: fixed, confidence: 0.7 };
  }
  if (fixed.startsWith("click ") || fixed.startsWith("open ")) {
    return { command: fixed, confidence: 0.6 };
  }
  if (fixed.startsWith("type ") && fixed.includes(" into ")) {
    return { command: fixed, confidence: 0.6 };
  }
  return { command: fixed, confidence: 0.4 };
};

const isPageGuideUtterance = (utterance) => {
  const norm = normalize(utterance);
  if (!norm) return false;
  if (
    [
      "help",
      "help me",
      "help me navigate",
      "guide me",
      "navigate this page",
      "help me use this page",
      "help me understand this page",
      "what can i do here",
      "what is this page",
      "page guide",
    ].includes(norm)
  ) {
    return true;
  }
  return norm.includes("help") && (norm.includes("navigate") || norm.includes("page"));
};

const backendFetchJson = (url, body) =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "A11Y_BACKEND_FETCH", url, method: "POST", body },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || `HTTP ${response?.status || 0}`));
          return;
        }
        resolve(response.json);
      }
    );
  });

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
  const data = await backendFetchJson(resolveUrl, payload);
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

const normalizeSpeechCommand = async (utterance) => {
  const backendUrl = (A11Y_STATE.settings.backendUrl || "").trim();
  if (isPageGuideUtterance(utterance)) return "help me navigate";
  const local = normalizeSpeechLocally(utterance);
  debugLog(`normalize: raw="${utterance}" local="${local.command}" conf=${local.confidence}`);
  if (isPageGuideUtterance(local.command)) return "help me navigate";
  if (local.confidence >= 0.8) return local.command;
  if (!backendUrl) return local.command || utterance;
  if (!A11Y_STATE.pageContext) {
    initPageContext();
  }
  const normalizeUrl = backendUrl.endsWith("/resolve")
    ? backendUrl.replace(/\/resolve$/, "/normalize")
    : backendUrl.endsWith("/plan")
    ? backendUrl.replace(/\/plan$/, "/normalize")
    : backendUrl.endsWith("/summarize")
    ? backendUrl.replace(/\/summarize$/, "/normalize")
    : `${backendUrl.replace(/\/+$/, "")}/normalize`;
  const payload = {
    utterance,
    url: location.href,
    pageContext: A11Y_STATE.pageContext || buildPageContext(),
    commandHints: COMMAND_HINTS,
  };
  let data;
  try {
    data = await backendFetchJson(normalizeUrl, payload);
  } catch (err) {
    debugLog(`normalize: remote error ${err?.message || err}`);
    return local.command || utterance;
  }
  if (!data || typeof data.normalizedCommand !== "string") return local.command || utterance;
  const normalized = data.normalizedCommand.trim();
  if (!normalized) return local.command || utterance;
  const confidence = typeof data.confidence === "number" ? data.confidence : 0;
  debugLog(`normalize: remote="${normalized}" conf=${confidence}`);
  if (confidence >= 0.55) return normalized;
  return local.command || utterance;
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

const debugLog = (message) => {
  if (!A11Y_STATE.debugEnabled || !A11Y_STATE.debugEl) return;
  const ts = new Date().toLocaleTimeString();
  A11Y_STATE.debugEl.style.display = "block";
  const line = `[${ts}] ${message}`;
  const existing = A11Y_STATE.debugEl.textContent || "";
  const next = existing ? `${line}\n${existing}` : line;
  A11Y_STATE.debugEl.textContent = next.slice(0, 2000);
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
      if (pauseSpeech()) toast("Reading paused.");
      interruptAgent();
      return;
    }
    if (state === "LISTENING" && STOP_WORDS.includes(trimmed)) {
      if (pauseSpeech()) toast("Reading paused.");
      interruptAgent();
      return;
    }
    if (RESUME_PHRASES.includes(trimmed)) {
      if (!A11Y_STATE.settings.textToSpeechEnabled) {
        toast("Enable text to speech in settings");
        return;
      }
      if (resumeSpeech()) {
        resumeAgentIfPaused();
        toast("Reading resumed.");
        return;
      }
      toast("Nothing to resume");
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

const resumeAgentIfPaused = () => {
  if (!A11Y_STATE.agent.enabled) return;
  if (A11Y_STATE.agent.state === "PAUSED") {
    A11Y_STATE.agent.interrupt = false;
    A11Y_STATE.agent.state = "LISTENING";
    updateAgentUi();
  }
};

const schedulePlanning = (utterance) => {
  if (A11Y_STATE.agent.pauseTimer) clearTimeout(A11Y_STATE.agent.pauseTimer);
  A11Y_STATE.agent.pauseTimer = setTimeout(() => {
    if (!A11Y_STATE.agent.enabled) return;
    if (utterance === A11Y_STATE.agent.lastUtterance) return;
    A11Y_STATE.agent.lastUtterance = utterance;
    normalizeSpeechCommand(utterance)
      .then((normalized) => {
        planAndExecute(normalized);
      })
      .catch(() => {
        planAndExecute(utterance);
      });
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
  if (
    text.includes("explain this article") ||
    text.includes("explain this page") ||
    text.includes("explain this") ||
    text.includes("summarize this") ||
    text === "summarize" ||
    text === "summary" ||
    text === "summarize page" ||
    text === "summarize the page" ||
    text === "summarize article" ||
    text === "summarize the article"
  ) {
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
  const searchMatch = text.match(/^search\s+(?:for\s+)?(.+)/);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    if (query) {
      return {
        actions: [
          { kind: "TYPE", value: query, fieldHint: "search" },
          { kind: "PRESS_KEY", key: "ENTER" },
        ],
      };
    }
  }
  const phrases = text.split(/,| then | and then | and /).map((p) => p.trim()).filter(Boolean);
  const actions = [];
  for (const phrase of phrases) {
    const searchPhrase = phrase.match(/^search\s+(?:for\s+)?(.+)/);
    if (searchPhrase) {
      const query = searchPhrase[1].trim();
      if (query) {
        actions.push({ kind: "TYPE", value: query, fieldHint: "search" });
        actions.push({ kind: "PRESS_KEY", key: "ENTER" });
        continue;
      }
    }
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
  if (isPageGuideUtterance(utterance)) {
    showPageGuide();
    A11Y_STATE.agent.state = "LISTENING";
    updateAgentUi();
    return;
  }
  const backendUrl = (A11Y_STATE.settings.backendUrl || "").trim();
  A11Y_STATE.agent.state = "PLANNING";
  A11Y_STATE.agent.interrupt = false;
  updateAgentUi();
  buildActionMap();
  const candidates = A11Y_STATE.actionMap.slice(0, 20);
  try {
    const localPlan = planLocally(utterance);
    if (localPlan) {
      debugLog(`agent: local plan actions=${localPlan.actions?.length || 0}`);
    }
    const plan = localPlan || (backendUrl ? await planWithAi(backendUrl, utterance, candidates) : null);
    debugLog(`agent: plan received actions=${plan?.actions?.length || 0}`);
    if (!plan) {
      toast("Set backend URL for agent planning");
      A11Y_STATE.agent.state = "LISTENING";
      updateAgentUi();
      return;
    }
    if (!validatePlan(plan)) {
      debugLog("agent: plan invalid");
      toast("Invalid plan");
      A11Y_STATE.agent.state = "LISTENING";
      updateAgentUi();
      return;
    }
    if (plan.needsClarification) {
      toast("Need clarification");
    }
    if (!plan?.actions?.length) {
      debugLog("agent: no plan returned");
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
  return backendFetchJson(planUrl, payload);
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
  if (fieldHint && isSearchHint(fieldHint)) {
    const candidates = getSearchFieldCandidates();
    if (!candidates.length) {
      toast("No search field found");
      return;
    }
    const [top, second] = candidates;
    if (top.score >= 0.7 && (!second || top.score - second.score >= 0.1)) {
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
    debugLog("summarize: backend url missing");
    return;
  }
  const text = extractArticleText(scope);
  if (!text) {
    toast("No readable text found");
    debugLog("summarize: no readable text");
    return;
  }
  A11Y_STATE.listEl.innerHTML = `<div class="list-item">Summarizing...</div>`;
  try {
    debugLog(`summarize: request bytes=${text.length}`);
    const summary = await summarizeWithAi(backendUrl, text);
    debugLog("summarize: success");
    renderSummary(summary);
    if (summary?.overview) speak(summary.overview);
  } catch (err) {
    toast("Summary failed");
    debugLog(`summarize: error ${err?.message || err}`);
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
  return backendFetchJson(summarizeUrl, { text });
};

const guideWithAi = async (backendUrl, payload) => {
  const guideUrl = backendUrl.endsWith("/resolve")
    ? backendUrl.replace(/\/resolve$/, "/guide")
    : backendUrl.endsWith("/plan")
    ? backendUrl.replace(/\/plan$/, "/guide")
    : backendUrl.endsWith("/summarize")
    ? backendUrl.replace(/\/summarize$/, "/guide")
    : backendUrl.endsWith("/answer")
    ? backendUrl.replace(/\/answer$/, "/guide")
    : `${backendUrl.replace(/\/+$/, "")}/guide`;
  return backendFetchJson(guideUrl, payload);
};

const showPageGuide = async () => {
  const backendUrl = (A11Y_STATE.settings.backendUrl || "").trim();
  if (!backendUrl) {
    toast("Set backend URL for guide");
    return;
  }
  if (!A11Y_STATE.pageContext) initPageContext();
  const url = location.href;
  const now = Date.now();
  const isFresh = A11Y_STATE.pageGuide && A11Y_STATE.pageGuideUrl === url && now - A11Y_STATE.pageGuideAt < 10 * 60 * 1000;
  if (isFresh) {
    renderPageGuide(A11Y_STATE.pageGuide);
    return;
  }
  if (A11Y_STATE.listEl) {
    A11Y_STATE.listEl.innerHTML = `<div class="list-item">Preparing guide...</div>`;
  }
  try {
    const guide = await guideWithAi(backendUrl, {
      url,
      pageContext: A11Y_STATE.pageContext || buildPageContext(),
    });
    if (guide) {
      A11Y_STATE.pageGuide = guide;
      A11Y_STATE.pageGuideAt = Date.now();
      A11Y_STATE.pageGuideUrl = url;
      renderPageGuide(guide);
    } else {
      toast("Guide unavailable");
    }
  } catch (err) {
    toast("Guide failed");
    debugLog(`guide: error ${err?.message || err}`);
  }
};

const renderPageGuide = (guide) => {
  if (!guide || !A11Y_STATE.listEl) return;
  const overview = escapeHtml(guide.overview || "Overview unavailable.");
  const actionsRaw = Array.isArray(guide.whatYouCanDo) ? guide.whatYouCanDo : [];
  const actions = actionsRaw.map((b) => `<li>${boldToolName(escapeHtml(b))}</li>`).join("");
  A11Y_STATE.listEl.innerHTML = `
    <div class="list-item"><strong>Page Brief</strong><div>${overview}</div></div>
    ${actions ? `<div class="list-item"><strong>What You Can Do</strong><ul>${actions}</ul></div>` : ""}
  `;
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const boldToolName = (text) => {
  const idx = text.indexOf(":");
  if (idx === -1) return text;
  const name = text.slice(0, idx).trim();
  const rest = text.slice(idx + 1).trim();
  if (!name) return text;
  return rest ? `<strong>${name}</strong>: ${rest}` : `<strong>${name}</strong>`;
};

const answerWithAi = async (backendUrl, payload) => {
  const answerUrl = backendUrl.endsWith("/resolve")
    ? backendUrl.replace(/\/resolve$/, "/answer")
    : backendUrl.endsWith("/plan")
    ? backendUrl.replace(/\/plan$/, "/answer")
    : backendUrl.endsWith("/summarize")
    ? backendUrl.replace(/\/summarize$/, "/answer")
    : `${backendUrl.replace(/\/+$/, "")}/answer`;
  return backendFetchJson(answerUrl, payload);
};

const answerQuestion = async (question) => {
  const backendUrl = (A11Y_STATE.settings.backendUrl || "").trim();
  if (!backendUrl) {
    toast("Set backend URL for answers");
    debugLog("answer: backend url missing");
    return;
  }
  if (!question) return;
  if (!A11Y_STATE.pageContext) {
    initPageContext();
  }
  const pageContext = A11Y_STATE.pageContext || buildPageContext();
  const text = extractArticleText("ARTICLE_MAIN");
  A11Y_STATE.listEl.innerHTML = `<div class="list-item">Answering...</div>`;
  try {
    debugLog(`answer: question="${question.slice(0, 180)}"`);
    const response = await answerWithAi(backendUrl, {
      question,
      url: location.href,
      pageContext,
      text,
    });
    clearList();
    renderAnswer(response);
    if (response?.answer) speak(response.answer);
  } catch (err) {
    toast("Answer failed");
    debugLog(`answer: error ${err?.message || err}`);
  }
};

const renderSummary = (summary) => {
  if (!summary) return;
  const bullets = (summary.bullets || []).map((b) => `<li>${b}</li>`).join("");
  const terms = (summary.keyTerms || []).map((t) => `<li>${t}</li>`).join("");
  if (!A11Y_STATE.summaryEl || !A11Y_STATE.summaryContentEl) return;
  A11Y_STATE.summaryEl.style.display = "block";
  A11Y_STATE.summaryContentEl.innerHTML = `
    <div><strong>Overview</strong><div>${summary.overview || "—"}</div></div>
    <div style="margin-top:8px;"><strong>Key Points</strong><ul>${bullets}</ul></div>
    ${terms ? `<div style="margin-top:8px;"><strong>Key Terms</strong><ul>${terms}</ul></div>` : ""}
  `;
  A11Y_STATE.lastSummaryText = summary.overview || "";
};

const canUseSpeechSynthesis = () => "speechSynthesis" in window;

const pauseSpeech = () => {
  if (!canUseSpeechSynthesis()) return false;
  const synth = window.speechSynthesis;
  if (synth.paused) {
    A11Y_STATE.ttsPaused = true;
    return true;
  }
  if (synth.speaking || synth.pending) {
    synth.pause();
    A11Y_STATE.ttsPaused = true;
    return true;
  }
  return false;
};

const resumeSpeech = () => {
  if (!canUseSpeechSynthesis()) return false;
  const synth = window.speechSynthesis;
  if (synth.paused || A11Y_STATE.ttsPaused) {
    synth.resume();
    A11Y_STATE.ttsPaused = false;
    return true;
  }
  return false;
};

const renderAnswer = (result) => {
  if (!result || !A11Y_STATE.summaryEl) return;
  const answer = result.answer || "I couldn't find that on this page.";
  const confidence =
    typeof result.confidence === "number" ? ` <span style="opacity:0.7">(conf ${Math.round(result.confidence * 100)}%)</span>` : "";
  A11Y_STATE.summaryEl.style.display = "block";
  A11Y_STATE.summaryEl.innerHTML = `
    <div><strong>Answer</strong>${confidence}<div>${answer}</div></div>
  `;
};

const speak = (text) => {
  if (!A11Y_STATE.settings.textToSpeechEnabled) return;
  if (!canUseSpeechSynthesis()) return;
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  A11Y_STATE.ttsPaused = false;
  utterance.onend = () => {
    A11Y_STATE.ttsPaused = false;
  };
  utterance.onerror = () => {
    A11Y_STATE.ttsPaused = false;
  };
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
  recognition.continuous = true;
  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const transcript = last[0].transcript.trim();
    A11Y_STATE.inputEl.value = transcript;
    if (last.isFinal) {
      normalizeSpeechCommand(transcript)
        .then((normalized) => {
          if (normalized !== transcript) {
            A11Y_STATE.inputEl.value = normalized;
          }
          executeInput(normalized);
        })
        .catch(() => executeInput(transcript));
    }
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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "A11Y_TOGGLE_PALETTE") {
    togglePalette();
  }
  if (msg?.type === "A11Y_TOGGLE_LABELS") {
    toggleLabelMode();
  }
  if (msg?.type === "A11Y_TOGGLE_AGENT") {
    toggleAgentMode();
  }
  if (msg?.type === "A11Y_GET_STATE") {
    sendResponse({ paletteOpen: A11Y_STATE.paletteOpen, visualEffectsEnabled: A11Y_STATE.settings.visualEffectsEnabled });
    return true;
  }
  if (msg?.type === "A11Y_SET_VISUALS") {
    A11Y_STATE.settings.visualEffectsEnabled = !!msg.enabled;
    A11Y_STATE.settings.visualPrefs = mergeVisualPrefs({
      ...A11Y_STATE.settings.visualPrefs,
      enabled: A11Y_STATE.settings.visualEffectsEnabled,
    });
    if (A11Y_STATE.settings.visualEffectsEnabled) {
      applyVisualPrefs(A11Y_STATE.settings.visualPrefs);
    } else {
      clearVisualEffects();
    }
    updateVisualPanelFields(A11Y_STATE.settings.visualPrefs);
    sendResponse({ ok: true });
    return true;
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
window.addEventListener("scroll", scheduleFocusModeSync, { passive: true });
window.addEventListener("resize", scheduleFocusModeSync);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.visualPrefs) {
    const prefs = mergeVisualPrefs({
      ...(changes.visualPrefs.newValue || DEFAULT_VISUAL_SETTINGS),
      enabled: A11Y_STATE.settings.visualEffectsEnabled === true,
    });
    A11Y_STATE.settings.visualPrefs = prefs;
    applyVisualPrefs(prefs);
    updateVisualPanelFields(prefs);
  }
  if (changes.textToSpeechEnabled) {
    A11Y_STATE.settings.textToSpeechEnabled = changes.textToSpeechEnabled.newValue;
  }
});

const initPaletteOnLoad = () => {
  initPageContext();
  showPalette().catch(() => {});
};

if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(initPaletteOnLoad, 0);
} else {
  window.addEventListener("DOMContentLoaded", initPaletteOnLoad, { once: true });
}

initVisualA11yFeatures();
