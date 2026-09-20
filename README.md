# Feed Filter — goal-aligned YouTube

A Chrome extension that frosts over YouTube listings that are clickbait, spam, or
irrelevant to goals you write yourself. Hover one and the blur lifts so you can read
it and click through. Judgement comes from
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

## What a blocked tile does

A flagged tile gets a frosted veil (`backdrop-filter`, 80% strength = a 16px blur)
and a corner chip carrying the tag — `CLICK-BAIT` in blue, `SPAM` in red, `OFF-GOAL`
in slate — plus the numbers behind the call.

Move the pointer onto it and the veil fades out over 0.18s and stops taking pointer
events, so the thumbnail and title are readable and the click lands on YouTube's own
link exactly as it normally would. Nothing is permanently dismissed and nothing is
removed from the layout; the chip stays (dimmed) while you look, so you always know
what was flagged. Blur strength is a slider in settings — drop it to 0 to keep the
tags and lose the frosting entirely.

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
test/browser.mjs   real content.js + real pointer input (node test/browser.mjs)
test/dom.html      the fake-YouTube page browser.mjs drives
icons/             see below
```

### Icons

`icons/no_spam_badge.svg` is the supplied source lockup (badge + "No spam" wordmark,
680x200). Manifest icons have to be square and the wordmark is unreadable at 16px, so
`icon.svg` is a square derivative of just the badge glyph, keeping the source's exact
colours (`#1D6FE0`, white) and proportions (circle r = 0.3125x height, stroke =
0.0625x, corner radius = 0.25x).

`icon-small.svg` is a chunkier variant used only for the 16px slot — scaled down from
128, the 1px curved stroke antialiases to pale blue and the ring all but vanishes.

`./icons/build.sh` rasterises both to `icon{16,32,48,128}.png` via headless Chrome.
Re-run it after editing either SVG.

Run both before trusting a change to the veil behaviour or the question rubrics.
`browser.mjs` talks to Chrome over CDP with no dependencies (Node 24's global
`WebSocket`), dispatches a real `mouseMoved`, and leaves before/after screenshots in
`/tmp/ygf-before.png` and `/tmp/ygf-after.png` so you can eyeball the blur.

## Known limits

- Jev is text-only, so thumbnails are never examined — a clean title over a
  screaming thumbnail gets through.
- Hover-to-clear needs a pointer. On a touchscreen there is no hover state, so a
  tap goes straight through to the video.
- Shorts are filtered as tiles in feeds and shelves. The immersive `/shorts/`
  swipe player is not covered.
- YouTube's DOM shifts; selectors in `TILE_SELECTOR` and `extract()` may need
  updating if tiles stop being detected.
