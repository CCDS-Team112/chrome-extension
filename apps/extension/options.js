const DEFAULTS = {
  voiceEnabled: true,
  agentModeEnabled: true,
  confirmDanger: true,
  demoMetrics: true,
  backendUrl: "http://localhost:8787/resolve",
};

const load = async () => {
  const settings = await chrome.storage.local.get(DEFAULTS);
  document.getElementById("voiceEnabled").checked = settings.voiceEnabled;
  document.getElementById("agentModeEnabled").checked = settings.agentModeEnabled;
  document.getElementById("confirmDanger").checked = settings.confirmDanger;
  document.getElementById("demoMetrics").checked = settings.demoMetrics;
  document.getElementById("backendUrl").value = settings.backendUrl || "";
};

const save = async () => {
  const payload = {
    voiceEnabled: document.getElementById("voiceEnabled").checked,
    agentModeEnabled: document.getElementById("agentModeEnabled").checked,
    confirmDanger: document.getElementById("confirmDanger").checked,
    demoMetrics: document.getElementById("demoMetrics").checked,
    backendUrl: document.getElementById("backendUrl").value.trim(),
  };
  await chrome.storage.local.set(payload);
  const status = document.getElementById("status");
  status.textContent = "Saved.";
  setTimeout(() => (status.textContent = ""), 1500);
};

document.getElementById("saveBtn").addEventListener("click", save);
load();
