const sendToActiveTab = async (message) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  chrome.tabs.sendMessage(tab.id, message).catch(() => {});
};

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-palette") {
    await sendToActiveTab({ type: "A11Y_TOGGLE_PALETTE" });
  }
  if (command === "toggle-labels") {
    await sendToActiveTab({ type: "A11Y_TOGGLE_LABELS" });
  }
  if (command === "toggle-agent") {
    await sendToActiveTab({ type: "A11Y_TOGGLE_AGENT" });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "A11Y_TOGGLE_PALETTE") {
    sendToActiveTab({ type: "A11Y_TOGGLE_PALETTE" });
    sendResponse({ ok: true });
    return true;
  }
  if (msg?.type === "A11Y_TOGGLE_LABELS") {
    sendToActiveTab({ type: "A11Y_TOGGLE_LABELS" });
    sendResponse({ ok: true });
    return true;
  }
  if (msg?.type === "A11Y_TOGGLE_AGENT") {
    sendToActiveTab({ type: "A11Y_TOGGLE_AGENT" });
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
