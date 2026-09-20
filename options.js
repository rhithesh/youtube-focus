const $ = (sel) => document.querySelector(sel);

const TEXT_FIELDS = ["goals", "apiKey", "model", "provider"];
const CHECK_FIELDS = ["hideUntilChecked", "fallbackHeuristics"];
const SLIDERS = {
  baitThreshold: { out: "#baitOut", fmt: (v) => Number(v).toFixed(1) + " / 3" },
  offGoalThreshold: { out: "#offGoalOut", fmt: (v) => Number(v).toFixed(1) + " / 3" },
  junkThreshold: { out: "#junkOut", fmt: (v) => Math.round(v * 100) + "%" },
  minConfidence: { out: "#confOut", fmt: (v) => Math.round(v * 100) + "%" },
};

let settings = null;

async function load() {
  settings = await chrome.runtime.sendMessage({ type: "settings" });

  for (const k of TEXT_FIELDS) $("#" + k).value = settings[k] ?? "";
  for (const k of CHECK_FIELDS) $("#" + k).checked = !!settings[k];
  for (const k of Object.keys(SLIDERS)) {
    $("#" + k).value = settings[k];
    paintSlider(k);
  }
  for (const box of document.querySelectorAll("[data-surface]")) {
    box.checked = settings.surfaces[box.dataset.surface] !== false;
  }

  if (!settings.onboarded || !settings.goals?.trim()) {
    $("#welcome").hidden = false;
    $("#goals").focus();
  }
}

function paintSlider(k) {
  $(SLIDERS[k].out).textContent = SLIDERS[k].fmt($("#" + k).value);
}

function collect() {
  const next = { ...settings };
  for (const k of TEXT_FIELDS) next[k] = $("#" + k).value.trim();
  for (const k of CHECK_FIELDS) next[k] = $("#" + k).checked;
  for (const k of Object.keys(SLIDERS)) next[k] = Number($("#" + k).value);
  next.surfaces = {};
  for (const box of document.querySelectorAll("[data-surface]")) next.surfaces[box.dataset.surface] = box.checked;
  next.model = next.model || "jev-latest";
  next.onboarded = true;
  return next;
}

function status(msg, cls = "") {
  const el = $("#status");
  el.textContent = msg;
  el.className = "status " + cls;
  if (msg) setTimeout(() => { if (el.textContent === msg) el.textContent = ""; }, 4000);
}

for (const k of Object.keys(SLIDERS)) $("#" + k).addEventListener("input", () => paintSlider(k));

$("#save").addEventListener("click", async () => {
  settings = collect();
  await chrome.storage.local.set({ settings });
  $("#welcome").hidden = true;
  status("Saved. Reload any open YouTube tab.", "ok");
});

$("#clearCache").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "clearCache" });
  status("Cached verdicts cleared.", "ok");
});

$("#test").addEventListener("click", async () => {
  const draft = collect();
  await chrome.storage.local.set({ settings: draft });
  settings = draft;

  const out = $("#testOut");
  out.hidden = false;
  out.textContent = "Calling " + draft.provider + " …";

  const res = await chrome.runtime.sendMessage({ type: "test", goals: draft.goals });
  if (!res.ok) {
    out.textContent = "FAILED after " + (res.ms ?? "?") + "ms\n\n" + res.error;
    status("Test call failed.", "err");
    return;
  }

  const lines = [
    "OK in " + res.ms + "ms · model " + res.model,
    "usage: " + JSON.stringify(res.usage),
    "",
  ];
  for (const r of res.rows) {
    lines.push((r.tag ? "[" + r.tag + "]" : "[allowed] ") + "  " + r.title);
    lines.push(
      "    bait " + r.scores.bait + "/3   off-goal " + r.scores.goal + "/3   spam " +
      Math.round(r.scores.junk * 100) + "%   confidence " + Math.round(r.scores.conf * 100) + "%"
    );
    lines.push("");
  }
  out.textContent = lines.join("\n");
  status("Test call succeeded.", "ok");
});

load();
