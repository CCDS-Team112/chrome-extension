(() => {
  const STYLE_ID = "readable-font-standardizer";
  const CONTROL_ID = "rfs-zoom-control";
  const CONTROL_STYLE_ID = `${CONTROL_ID}-style`;
  const ZOOM_STEP_KEY = "rfsZoomStep";
  const ZOOM_HISTORY_KEY = "rfsZoomHistory";
  const MIN_ZOOM_STEP = 0;
  const MAX_ZOOM_STEP = 12;
  const DEFAULT_ZOOM_STEP = 3;
  const SCALE_BASE = 1;
  const SCALE_INCREMENT = 0.1;
  const MAX_HISTORY_ITEMS = 100;
  let currentStep = DEFAULT_ZOOM_STEP;
  const hasExtensionStorage =
    typeof chrome !== "undefined" &&
    chrome.storage &&
    chrome.storage.local &&
    typeof chrome.storage.local.get === "function" &&
    typeof chrome.storage.local.set === "function";

  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  document.documentElement.appendChild(style);

  const clampStep = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_ZOOM_STEP;
    const rounded = Math.round(numeric);
    return Math.min(MAX_ZOOM_STEP, Math.max(MIN_ZOOM_STEP, rounded));
  };

  const scaleFromStep = (step) => Number((SCALE_BASE + step * SCALE_INCREMENT).toFixed(2));

  const readFallbackStorage = (key, fallback) => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  };

  const writeFallbackStorage = (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  };

  const readStorage = (key, fallback) =>
    new Promise((resolve) => {
      if (!hasExtensionStorage) {
        resolve(readFallbackStorage(key, fallback));
        return;
      }
      chrome.storage.local.get({ [key]: fallback }, (items) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          resolve(fallback);
          return;
        }
        resolve(items[key]);
      });
    });

  const writeStorage = (key, value) =>
    new Promise((resolve) => {
      if (!hasExtensionStorage) {
        writeFallbackStorage(key, value);
        resolve();
        return;
      }
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });

  const appendZoomHistory = async (step) => {
    const nextStep = clampStep(step);
    const entry = {
      at: new Date().toISOString(),
      url: location.href,
      step: nextStep,
      scale: scaleFromStep(nextStep),
    };
    const history = await readStorage(ZOOM_HISTORY_KEY, []);
    const safeHistory = Array.isArray(history) ? history : [];
    safeHistory.push(entry);
    const trimmed = safeHistory.slice(-MAX_HISTORY_ITEMS);
    await writeStorage(ZOOM_HISTORY_KEY, trimmed);
  };

  const renderCss = (step) => {
    const scale = scaleFromStep(step);
    style.textContent = `
:root {
  --rfs-font-size: calc(16px * ${scale});
  --rfs-line-height: 1.6;
  --rfs-letter-spacing: 0.01em;
  --rfs-fluid-gap: calc(0.8rem * ${scale});
}

html, body {
  max-width: 100% !important;
  overflow-x: auto !important;
}

*, *::before, *::after {
  box-sizing: border-box !important;
}

body, body * {
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: var(--rfs-font-size) !important;
  line-height: var(--rfs-line-height) !important;
  letter-spacing: var(--rfs-letter-spacing) !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
}

code, pre, kbd, samp, textarea, input, select, button {
  font-family: Arial, Helvetica, sans-serif !important;
  max-width: 100% !important;
}

main, article, section, div, header, footer, nav, aside {
  max-width: 100% !important;
}

img, picture, video, iframe, canvas, svg {
  max-width: 100% !important;
  height: auto !important;
}

table {
  width: auto !important;
  max-width: 100% !important;
  display: block !important;
  overflow-x: auto !important;
  border-collapse: collapse !important;
}

pre, code {
  max-width: 100% !important;
  overflow-x: auto !important;
  white-space: pre-wrap !important;
}

nav, [role="navigation"], .nav, .navbar {
  max-width: 100% !important;
  overflow-x: auto !important;
}

[style*="display:flex"], [style*="display: flex"], .flex, .row {
  flex-wrap: wrap !important;
  gap: var(--rfs-fluid-gap) !important;
}

[style*="width:"], [width] {
  max-width: 100% !important;
}

[style*="overflow: hidden"], [style*="overflow:hidden"] {
  overflow: auto !important;
}
`;
  };

  const ensureZoomControl = () => {
    if (document.getElementById(CONTROL_ID)) return;
    const control = document.createElement("div");
    control.id = CONTROL_ID;
    control.setAttribute("role", "group");
    control.setAttribute("aria-label", "Readable zoom controls");
    control.innerHTML = `
      <button type="button" data-rfs-action="out">Zoom Out</button>
      <span class="rfs-zoom-value" aria-live="polite">100%</span>
      <button type="button" data-rfs-action="in">Zoom In</button>
    `;
    document.documentElement.appendChild(control);
    control.addEventListener("click", onControlClick);
  };

  const updateZoomControl = (step) => {
    const control = document.getElementById(CONTROL_ID);
    if (!control) return;
    const zoomOutBtn = control.querySelector('button[data-rfs-action="out"]');
    const zoomInBtn = control.querySelector('button[data-rfs-action="in"]');
    const value = control.querySelector(".rfs-zoom-value");
    if (value) value.textContent = `${Math.round(scaleFromStep(step) * 100)}%`;
    if (zoomOutBtn) zoomOutBtn.disabled = step <= MIN_ZOOM_STEP;
    if (zoomInBtn) zoomInBtn.disabled = step >= MAX_ZOOM_STEP;
  };

  const injectControlCss = () => {
    if (document.getElementById(CONTROL_STYLE_ID)) return;
    const controlStyle = document.createElement("style");
    controlStyle.id = CONTROL_STYLE_ID;
    controlStyle.textContent = `
#${CONTROL_ID} {
  position: fixed !important;
  right: 12px !important;
  bottom: 12px !important;
  z-index: 2147483647 !important;
  display: flex !important;
  gap: 8px !important;
  background: rgba(255, 255, 255, 0.92) !important;
  border: 1px solid #cbd5e1 !important;
  border-radius: 12px !important;
  padding: 8px !important;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22) !important;
  max-width: calc(100vw - 24px) !important;
  overflow-x: auto !important;
}

#${CONTROL_ID} button {
  border: 1px solid #cbd5e1 !important;
  border-radius: 8px !important;
  padding: 6px 10px !important;
  background: #ffffff !important;
  color: #111827 !important;
  font: 600 13px/1 Arial, Helvetica, sans-serif !important;
  cursor: pointer !important;
  white-space: nowrap !important;
}

#${CONTROL_ID} button:disabled {
  cursor: not-allowed !important;
  opacity: 0.45 !important;
}

#${CONTROL_ID} .rfs-zoom-value {
  align-self: center !important;
  min-width: 54px !important;
  text-align: center !important;
  color: #0f172a !important;
  font: 700 13px/1 Arial, Helvetica, sans-serif !important;
}

#${CONTROL_ID} button:focus {
  outline: 2px solid #93c5fd !important;
  outline-offset: 1px !important;
}
`;
    document.documentElement.appendChild(controlStyle);
  };

  const persistStep = async (step, trackHistory) => {
    await writeStorage(ZOOM_STEP_KEY, step);
    if (trackHistory) {
      await appendZoomHistory(step);
    }
  };

  const setZoomStep = (step, options = {}) => {
    const { persist = true, trackHistory = false } = options;
    const nextStep = clampStep(step);
    currentStep = nextStep;
    renderCss(nextStep);
    document.documentElement.setAttribute("data-rfs-zoom-step", String(nextStep));
    updateZoomControl(nextStep);
    if (persist) {
      persistStep(nextStep, trackHistory);
    }
  };

  const bumpStep = (direction, trackHistory) => {
    setZoomStep(currentStep + direction, { persist: true, trackHistory });
  };

  const onControlClick = (event) => {
    const button = event.target.closest("button[data-rfs-action]");
    if (!button) return;
    const action = button.getAttribute("data-rfs-action");
    if (action === "in") bumpStep(1, true);
    if (action === "out") bumpStep(-1, true);
  };

  // Keyboard: Ctrl+Shift+= for larger, Ctrl+Shift+- for smaller.
  document.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey && event.shiftKey)) return;
    if (event.key === "=" || event.key === "+") {
      bumpStep(1, true);
    }
    if (event.key === "-" || event.key === "_") {
      bumpStep(-1, true);
    }
  });

  // Optional external control:
  // window.dispatchEvent(new CustomEvent("rfs:set-zoom-step", { detail: { step: 5 } }));
  window.addEventListener("rfs:set-zoom-step", (event) => {
    setZoomStep(event.detail?.step, { persist: true, trackHistory: false });
  });

  const init = async () => {
    injectControlCss();
    ensureZoomControl();
    setZoomStep(DEFAULT_ZOOM_STEP, { persist: false });
    const storedStep = await readStorage(ZOOM_STEP_KEY, DEFAULT_ZOOM_STEP);
    setZoomStep(storedStep, { persist: false });
  };

  init();
})();
