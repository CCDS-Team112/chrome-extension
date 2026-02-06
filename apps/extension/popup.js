const statusEl = document.getElementById("status");
const powerToggle = document.getElementById("powerToggle");
const toggleLabel = document.getElementById("toggleLabel");
const paletteToggleBtn = document.getElementById("paletteToggleBtn");
const paletteStatus = document.getElementById("paletteStatus");

const setUi = (state) => {
  if (!state || typeof state.visualEffectsEnabled !== "boolean") {
    statusEl.textContent = "This page blocks extensions.";
    toggleLabel.textContent = "Unavailable";
    powerToggle.checked = false;
    powerToggle.disabled = true;
    if (paletteToggleBtn) paletteToggleBtn.disabled = true;
    if (paletteStatus) paletteStatus.textContent = "Palette unavailable on this page.";
    return;
  }
  powerToggle.disabled = false;
  powerToggle.checked = state.visualEffectsEnabled;
  toggleLabel.textContent = state.visualEffectsEnabled ? "On" : "Off";
  statusEl.textContent = state.visualEffectsEnabled ? "Visual effects are enabled." : "Visual effects are disabled.";
  if (paletteToggleBtn) {
    paletteToggleBtn.disabled = false;
    paletteToggleBtn.textContent = state.paletteOpen ? "Hide Palette" : "Enable Palette";
  }
  if (paletteStatus) {
    paletteStatus.textContent = state.paletteOpen
      ? "Palette is open on this page."
      : "Toggle the command palette on this page.";
  }
};

const queryState = async () => {
  try {
    const state = await chrome.runtime.sendMessage({ type: "A11Y_GET_STATE" });
    if (!state || typeof state.visualEffectsEnabled !== "boolean") {
      setUi(null);
      return;
    }
    setUi(state);
  } catch (_) {
    setUi(null);
  }
};

powerToggle.addEventListener("change", async () => {
  try {
    await chrome.runtime.sendMessage({ type: "A11Y_SET_VISUALS", enabled: powerToggle.checked });
    await queryState();
  } finally {
    window.close();
  }
});

if (paletteToggleBtn) {
  paletteToggleBtn.addEventListener("click", async () => {
    try {
      await chrome.runtime.sendMessage({ type: "A11Y_TOGGLE_PALETTE" });
      await queryState();
    } finally {
      window.close();
    }
  });
}

queryState();
