const toggleBtn = document.getElementById("toggleBtn");
const statusEl = document.getElementById("status");
const powerToggle = document.getElementById("powerToggle");

const setUi = (state) => {
  if (!state || typeof state.visualEffectsEnabled !== "boolean") {
    toggleBtn.textContent = "Palette Unavailable";
    toggleBtn.disabled = true;
    statusEl.textContent = "This page blocks extensions.";
    powerToggle.checked = false;
    powerToggle.disabled = true;
    return;
  }
  powerToggle.disabled = false;
  powerToggle.checked = state.visualEffectsEnabled;
  toggleBtn.disabled = false;
  toggleBtn.textContent = state.paletteOpen ? "Disable Palette" : "Enable Palette";
  statusEl.textContent = state.paletteOpen ? "Palette is on." : "Palette is off.";
};

const queryState = async () => {
  try {
    const state = await chrome.runtime.sendMessage({ type: "A11Y_GET_STATE" });
    if (!state || typeof state.paletteOpen !== "boolean" || typeof state.visualEffectsEnabled !== "boolean") {
      setUi(null);
      return;
    }
    setUi(state);
  } catch (_) {
    setUi(null);
  }
};

toggleBtn.addEventListener("click", async () => {
  try {
    await chrome.runtime.sendMessage({ type: "A11Y_TOGGLE_PALETTE" });
    await queryState();
  } finally {
    window.close();
  }
});

powerToggle.addEventListener("change", async () => {
  try {
    await chrome.runtime.sendMessage({ type: "A11Y_SET_VISUALS", enabled: powerToggle.checked });
    await queryState();
  } finally {
    window.close();
  }
});

queryState();
