const statusEl = document.getElementById("status");
const powerToggle = document.getElementById("powerToggle");
const toggleLabel = document.getElementById("toggleLabel");

const setUi = (state) => {
  if (!state || typeof state.visualEffectsEnabled !== "boolean") {
    statusEl.textContent = "This page blocks extensions.";
    toggleLabel.textContent = "Unavailable";
    powerToggle.checked = false;
    powerToggle.disabled = true;
    return;
  }
  powerToggle.disabled = false;
  powerToggle.checked = state.visualEffectsEnabled;
  toggleLabel.textContent = state.visualEffectsEnabled ? "On" : "Off";
  statusEl.textContent = state.visualEffectsEnabled ? "Visual effects are enabled." : "Visual effects are disabled.";
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

queryState();
