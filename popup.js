const $ = (s) => document.querySelector(s);

let settings = null;

async function init() {
  settings = (await chrome.storage.local.get("settings")).settings || {};
  $("#enabled").checked = !!settings.enabled;
  showState(!!settings.enabled);

  $("#goals").textContent = settings.goals?.trim() || "No goals set yet — open settings and describe what you want out of your feeds.";

  const { lastError, freeUsage, freePausedUntil } = await chrome.storage.local.get(["lastError", "freeUsage", "freePausedUntil"]);
  const recentError = lastError && Date.now() - lastError.at < 10 * 60 * 1000;
  if (!settings.apiKey && settings.freeTier === false) {
    show(settings.fallbackHeuristics
      ? "No API key and the free tier is off: keyword rules only."
      : "No API key and the free tier is off. Nothing is being filtered.");
  } else if (!settings.apiKey) {
    const today = new Date().toISOString().slice(0, 10);
    if (freePausedUntil && Date.now() < freePausedUntil && recentError) show(lastError.msg);
    else if (freeUsage && new Date(freeUsage.at).toISOString().slice(0, 10) === today)
      showNote(`Free tier · ${freeUsage.remaining} of ${freeUsage.limit} posts left today.`);
    else showNote("Free tier. Add your own key in settings for unlimited.");
  } else if (recentError) {
    show(lastError.msg);
  }

  // tab.url is hidden without the "tabs" permission, so ask the tab directly;
  // only a YouTube, X or LinkedIn tab has a content script to answer.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "stats" }, (res) => {
    if (chrome.runtime.lastError || !res) {
      show("Not filtering this tab. On YouTube, X or LinkedIn? Reload the page.");
      return;
    }
    $("#blocked").textContent = res.blocked;
    $("#judged").textContent = res.judged;
  });
}

function showState(on) {
  $("#state").innerHTML = on ? "Filter <em>on</em>" : "Filter <em>off</em>";
}

function showNote(msg) {
  const el = $("#note");
  el.hidden = false;
  el.textContent = msg;
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
  showState(e.target.checked);
});

$("#open").addEventListener("click", () => chrome.runtime.openOptionsPage());

init();
