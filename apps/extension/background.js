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
  if (msg?.type === "A11Y_BACKEND_FETCH") {
    const { url, method = "POST", headers = {}, body } = msg;
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined,
    })
      .then(async (res) => {
        let json = null;
        try {
          json = await res.json();
        } catch (_) {}
        sendResponse({ ok: res.ok, status: res.status, json });
      })
      .catch((err) => {
        sendResponse({ ok: false, status: 0, error: err?.message || "fetch failed" });
      });
    return true;
  }
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
  if (msg?.type === "A11Y_GET_STATE") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab || !tab.id) {
        sendResponse({ paletteOpen: false });
        return;
      }
      chrome.tabs.sendMessage(tab.id, { type: "A11Y_GET_STATE" }, (res) => {
        if (chrome.runtime.lastError) {
          sendResponse(null);
          return;
        }
        sendResponse(res || null);
      });
    });
    return true;
  }
  if (msg?.type === "A11Y_SET_VISUALS") {
    chrome.storage.local.set({ visualEffectsEnabled: !!msg.enabled });
    sendToActiveTab({ type: "A11Y_SET_VISUALS", enabled: !!msg.enabled });
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
