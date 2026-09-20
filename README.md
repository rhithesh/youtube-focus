# Feed Filter — goal-aligned YouTube

A Chrome extension that blacks out YouTube listings that are clickbait, spam, or
irrelevant to goals you write yourself. Judgement comes from
[TypeSafe's **Jev**](https://typesafe.ai/blog/introducing-system-one-models-and-jev),
a System One model: you hand it state plus typed questions, and it hands back
typed answers with calibrated probabilities instead of prose.

## Install

1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** → pick this folder.
2. The settings page opens on install. Write your goals, paste your API key, hit
   **Run a test call**, then **Save**.
3. Reload any open YouTube tab.

## How it judges

Every listing in view is reduced to its text — title, channel, duration, view count,
whether it's a Short — and a whole page of them goes out as **one** request to
`POST /v1/systemone`. Jev reads the state once and answers every question against it
in parallel, so a page costs one round trip.

Measured against OpenRouter, 10 listings (30 questions, 6.4k input tokens) came back
in **~950ms for $0.00027**. Output tokens are free. A 20-listing batch runs about
$0.0005, so a heavy day of scrolling costs a few cents.

Each listing gets three questions:

| Key | Primitive | What it asks |
| --- | --- | --- |
| `vN_bait` | `score`, 4 levels | plain and accurate → pure engagement bait |
| `vN_goal` | `score`, 4 levels | directly advances your goals → unrelated distraction |
| `vN_junk` | `noul` | probability this is spam, a scam, or mass-produced slop |

Your code — not the model — decides what to do with those numbers. Thresholds live
in settings, `SPAM` outranks `CLICK-BAIT` outranks `OFF-GOAL`, and every block is
**confidence-gated**: Jev reports certainty separately from the answer, so a high
score it isn't sure about leaves the tile alone. Raise *Minimum confidence* if you
see false blocks; lower the score thresholds to get stricter.

The spam threshold defaults to **0.85** rather than something lower, for a reason
found by testing: clickbait titles score 0.45–0.75 on the spam question because
"low-effort filler" genuinely overlaps with bait, while real scams score 0.9+. A
lower gate makes bait get tagged `SPAM`, which is the right call for the wrong
reason. The displayed confidence is always the one belonging to the signal that
decided — a `SPAM` verdict shows none, because nouls don't carry a confidence field.

Blocked tiles go solid black with a tag (`CLICK-BAIT` / `SPAM` / `OFF-GOAL`) and the
numbers behind it. **show anyway** reveals one, leaving a small corner badge.

## Providers

Both speak the identical TypeSafe request/response shape:

- **OpenRouter** — `https://openrouter.ai/api/v1/systemone`, key from
  [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys). `jev-latest`
  routes to `~typesafe/jev-latest`.
- **TypeSafe direct** — `https://api.typesafe.ai/v1/systemone`, key from
  [console.typesafe.ai/keys](https://console.typesafe.ai/keys) (early access).

Your key is stored in `chrome.storage.local` and sent only to the endpoint you pick.
With no key set, the extension falls back to keyword heuristics for obvious bait and
scams — far blunter, and it can't do goal-alignment at all.

## Verdict caching

Verdicts are cached per video id in `chrome.storage.local` for 7 days, stamped with a
hash of your goals, model and thresholds. Change any of those and the cache
invalidates itself. **Clear cached verdicts** in settings forces a re-judge.

## Layout

```
manifest.json     MV3 manifest
background.js     batching, Jev calls, verdict logic, cache
content.js        tile discovery, extraction, masking
content.css       the black tile
options.*         goals, key, surfaces, thresholds, test call
popup.*           on/off, per-page counts, errors
test/validate.mjs offline schema + threshold checks (node test/validate.mjs)
test/dom.html      real content.js against fake tiles (./test/run-dom.sh)
```

Run both before trusting a change to masking or to the question rubrics.

## Known limits

- Jev is text-only, so thumbnails are never examined — a clean title over a
  screaming thumbnail gets through.
- Shorts are filtered as tiles in feeds and shelves. The immersive `/shorts/`
  swipe player is not covered.
- YouTube's DOM shifts; selectors in `TILE_SELECTOR` and `extract()` may need
  updating if tiles stop being detected.
