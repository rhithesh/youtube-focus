// Shared by the FAQ section and the FAQPage structured data in page.tsx.
export const FAQS = [
  {
    q: "Does it delete or hide anything?",
    a: "No. Flagged posts are blurred where they are. Hover one and the blur lifts so you can read it and click through. Switch the filter off from the toolbar and every blur is gone at once.",
  },
  {
    q: "Where does it work?",
    a: "YouTube (home, search, the watch-next sidebar and Shorts), your X timeline and your LinkedIn feed. You can switch each one off separately in settings.",
  },
  {
    q: "What does it cost?",
    a: "Nothing, to start. Without a key, Feed Filter’s free tier judges up to 300 posts a day, and verdicts are cached for a week so scrolling back past something doesn’t count again. Want unlimited? Bring your own OpenRouter key: about $0.0003 for a page of ten posts. If the free tier is ever used up, keyword rules keep catching the obvious bait until it resets.",
  },
  {
    q: "Where do my posts and goals go?",
    a: "On the free tier, the text of each post and your goals pass through Feed Filter’s server on their way to the model; nothing is stored or logged, only an anonymous daily counter. With your own key, they go straight from your browser to OpenRouter or TypeSafe and Feed Filter never sees them. Settings and keys live in your browser (chrome.storage.local).",
  },
  {
    q: "What won’t it catch?",
    a: "The model reads text, not images, so a calm title over a screaming thumbnail gets through, and X posts with no text aren’t judged. Hover needs a mouse. And all three sites change their pages often, so the extension may occasionally need an update.",
  },
];
