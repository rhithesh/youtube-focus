const $ = (s) => document.querySelector(s);

let settings = null;

async function init() {
  settings = (await chrome.storage.local.get("settings")).settings || {};
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

  // tab.url is hidden without the "tabs" permission, so ask the tab directly;
  // only a YouTube tab has a content script to answer.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "stats" }, (res) => {
    if (chrome.runtime.lastError || !res) {
      show("Not filtering this tab. On YouTube? Reload the page.");
      return;
    }
    $("#blocked").textContent = res.blocked;
    $("#judged").textContent = res.judged;
  });
}

function show(msg) {
  const el = $("#warn");
  el.hidden = false;
  el.textContent = el.textContent ? el.textContent + " " + msg : msg;
}

// Single hop, no preceding await: the popup gets torn down the instant it loses
// focus, so a change handler that awaits anything before writing can lose the
// write entirely if the user clicks away right after toggling.
$("#enabled").addEventListener("change", (e) => {
  settings.enabled = e.target.checked;
  chrome.storage.local.set({ settings });
});

$("#open").addEventListener("click", () => chrome.runtime.openOptionsPage());

init();
