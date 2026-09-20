const $ = (s) => document.querySelector(s);

async function init() {
  const settings = await chrome.runtime.sendMessage({ type: "settings" });
  $("#enabled").checked = !!settings.enabled;

  $("#goals").textContent = settings.goals?.trim() || "No goals set yet — open settings and describe what you want out of YouTube.";

  const { lastError } = await chrome.storage.local.get("lastError");
  if (!settings.apiKey) {
    show(settings.fallbackHeuristics
      ? "No API key — running on keyword heuristics only. Add a key for Jev."
      : "No API key set. Nothing is being filtered.");
  } else if (lastError && Date.now() - lastError.at < 10 * 60 * 1000) {
    show(lastError.msg);
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "stats" }, (res) => {
      if (chrome.runtime.lastError || !res) return;
      $("#blocked").textContent = res.blocked;
      $("#judged").textContent = res.judged;
    });
  }
}

function show(msg) {
  $("#warn").hidden = false;
  $("#warn").textContent = msg;
}

$("#enabled").addEventListener("change", async (e) => {
  const settings = await chrome.runtime.sendMessage({ type: "settings" });
  settings.enabled = e.target.checked;
  await chrome.storage.local.set({ settings });
});

$("#open").addEventListener("click", () => chrome.runtime.openOptionsPage());

init();
