// Every `blurred` flag and score here is a real Jev answer, captured from
// OpenRouter with the extension's own buildRequest()/verdictFrom() and default thresholds.

export type Platform = "youtube" | "x" | "linkedin";

type Base = { id: string; blurred: boolean };

export type Video = Base & {
  platform: "youtube";
  title: string;
  channel: string;
  duration: string;
  meta: string;
  // a real thumbnail, or a typographic stand-in for the bait we'd rather not host
  thumb: { src: string } | { text: string; bg: string; fg: string };
};

export type Post = Base & {
  platform: "x" | "linkedin";
  name: string;
  handle: string; // X handle, or LinkedIn headline
  when: string;
  text: string;
  stats: string;
};

export type Item = Video | Post;

export const HERO_GOAL = "Crack Google interviews: LeetCode, system design, programming and real tech news.";

export const HERO_FEEDS: Record<Platform, Item[]> = {
  youtube: [
    { id: "yt-3am", platform: "youtube", blurred: false, title: "3AM Observability Crash Course (A True Story)", channel: "pouria", duration: "18:40", meta: "753K views · 2 weeks ago", thumb: { src: "/tiles/live-3am.jpg" } },
    { id: "yt-quit", platform: "youtube", blurred: true, title: "I QUIT MY JOB AND THIS HAPPENED 😱😱", channel: "Vlog Life", duration: "22:40", meta: "3.4M views · 4 days ago", thumb: { text: "I QUIT 😱", bg: "#E5352B", fg: "#FFF34F" } },
    { id: "yt-dsa", platform: "youtube", blurred: false, title: "How I Actually Mastered Data Structures and Algorithms (After Wasting 3 Years)", channel: "Rajat Garg", duration: "16:05", meta: "206K views · 3 months ago", thumb: { src: "/tiles/live-dsa.jpg" } },
    { id: "yt-millionaire", platform: "youtube", blurred: true, title: "How I Made $10,000 In ONE DAY With AI (No Skills Needed) 🤑", channel: "Hustle Academy", duration: "9:12", meta: "890K views · 1 week ago", thumb: { text: "$10,000 IN 1 DAY 🤑", bg: "#0E0E0E", fg: "#7DFF6A" } },
    { id: "yt-tiny", platform: "youtube", blurred: false, title: "This AI Startup Is Making Powerful AI Models (Desert Ant Labs)", channel: "Better Stack", duration: "12:31", meta: "125K views · 7 days ago", thumb: { src: "/tiles/live-tiny.jpg" } },
    { id: "yt-physics", platform: "youtube", blurred: false, title: "Physics doesn't explain the universe. Computation does | Stephen Wolfram: Full Interview", channel: "Wolfram", duration: "54:08", meta: "full interview", thumb: { src: "/tiles/live-physics.jpg" } },
  ],
  x: [
    { id: "x-hashing", platform: "x", blurred: false, name: "Priya Nair", handle: "@priya_builds", when: "2h", text: "Shipped consistent hashing for our cache tier today. Wrote up virtual nodes vs. rendezvous hashing and why we picked the ring:", stats: "12 replies · 40 reposts · 310 likes" },
    { id: "x-destroyed", platform: "x", blurred: true, name: "Pop Tea", handle: "@popteadaily", when: "5h", text: "This celebrity just DESTROYED the other one in the most savage reply ever 😭😭", stats: "4.1K replies · 12K reposts · 88K likes" },
    { id: "x-go", platform: "x", blurred: false, name: "Go", handle: "@golang", when: "1h", text: "Go 1.26 is out: generic type aliases are stable, and the new GC cuts tail latency on large heaps. Release notes ↓", stats: "210 replies · 1.9K reposts · 7.2K likes" },
    { id: "x-airdrop", platform: "x", blurred: true, name: "Solana Rewards", handle: "@sol_rewards_io", when: "1h", text: "🚨 FREE $SOL AIRDROP 🚨 First 500 wallets only. Connect at sol-claim-rewards[.]xyz before midnight 🚀🚀", stats: "3 replies · 900 reposts · 1.1K likes" },
  ],
  linkedin: [
    { id: "li-graphs", platform: "linkedin", blurred: false, name: "Ana Costa", handle: "Software Engineer at Google", when: "1d", text: "Graph problems I got across 4 Google interview loops, and the one pattern behind all of them: turn the grid into an implicit graph, then BFS with state.", stats: "1,204 reactions · 86 comments" },
    { id: "li-fired", platform: "linkedin", blurred: true, name: "Growth Coach", handle: "Helping founders 10x their mindset", when: "3h", text: "I fired my best employee.\n\nHe was talented.\n\nBut he taught me something.\n\nHere's what happened next 👇\n\nAgree?", stats: "9,870 reactions · 2,311 comments" },
    { id: "li-postmortem", platform: "linkedin", blurred: false, name: "Daniel Reyes", handle: "Staff Engineer, Platform", when: "2d", text: "Our Postgres failover took 11 minutes instead of 30 seconds. Postmortem: a replication slot nobody owned kept WAL growing until the replica fell behind. Fixes inside.", stats: "642 reactions · 51 comments" },
    { id: "li-synergy", platform: "linkedin", blurred: true, name: "Visionary Leader", handle: "Thought Leader | Keynote Speaker", when: "6h", text: "In today's fast-paced world, leveraging synergy isn't just a buzzword — it's a mindset. 🚀 Leaders who embrace change unlock limitless potential. #Leadership #Growth #Mindset", stats: "311 reactions · 97 comments" },
  ],
};

// One request per platform above, ~1s each, ~$0.0003–0.0004.
export const HERO_RUN = { ms: 1054, cost: "$0.0004" };

export type GoalKey = "interviews" | "cooking" | "strength";

export const GOALS: Record<GoalKey, { label: string; text: string; blurred: string[] }> = {
  interviews: {
    label: "Crack  interviews",
    text: "Crack Google LeetCode, system design, programming and real tech news.",
    blurred: ["yt-tikka", "yt-quit", "x-sourdough", "x-destroyed", "li-overload", "li-fired"],
  },
  cooking: {
    label: "Learn to cook",
    text: "Learn to cook real meals at home, from weeknight dinners to bread.",
    blurred: ["yt-urlshort", "yt-quit", "x-go", "x-destroyed", "li-graphs", "li-overload", "li-fired"],
  },
  strength: {
    label: "Get stronger",
    text: "Get stronger: lifting, programming my training, and mobility.",
    blurred: ["yt-urlshort", "yt-tikka", "yt-quit", "x-go", "x-sourdough", "x-destroyed", "li-graphs", "li-fired"],
  },
};

export const GOAL_FEED: Item[] = [
  { id: "yt-urlshort", platform: "youtube", blurred: false, title: "Design a URL Shortener — System Design Interview", channel: "System Design Fight Club", duration: "32:10", meta: "210K views · 1 month ago", thumb: { text: "URL SHORTENER · SYSTEM DESIGN", bg: "#1D2A4A", fg: "#F3F0E8" } },
  { id: "x-destroyed", platform: "x", blurred: false, name: "Pop Tea", handle: "@popteadaily", when: "5h", text: "This celebrity just DESTROYED the other one in the most savage reply ever 😭😭", stats: "4.1K replies · 12K reposts · 88K likes" },
  { id: "li-overload", platform: "linkedin", blurred: false, name: "Sam Okafor", handle: "Strength coach", when: "1d", text: "Progressive overload isn't only adding weight. The four variables I track every session: load, reps, tempo, and rest. Here's the log template I use.", stats: "2,040 reactions · 133 comments" },
  { id: "yt-tikka", platform: "youtube", blurred: false, title: "15-Minute Chicken Tikka Masala (Restaurant Style at Home)", channel: "Weeknight Kitchen", duration: "14:52", meta: "1.1M views · 3 weeks ago", thumb: { text: "15-MIN TIKKA MASALA", bg: "#F0A33C", fg: "#3A1D0B" } },
  { id: "x-go", platform: "x", blurred: false, name: "Go", handle: "@golang", when: "1h", text: "Go 1.26 is out: generic type aliases are stable, and the new GC cuts tail latency on large heaps. Release notes ↓", stats: "210 replies · 1.9K reposts · 7.2K likes" },
  { id: "li-fired", platform: "linkedin", blurred: false, name: "Growth Coach", handle: "Helping founders 10x their mindset", when: "3h", text: "I fired my best employee.\n\nHe was talented.\n\nBut he taught me something.\n\nHere's what happened next 👇\n\nAgree?", stats: "9,870 reactions · 2,311 comments" },
  { id: "x-sourdough", platform: "x", blurred: false, name: "Maya Bakes", handle: "@mayabakes", when: "4h", text: "Sourdough starter day 7: finally doubling in 4 hours. A 1:5:5 feeding ratio at 26°C is what did it.", stats: "38 replies · 120 reposts · 1.4K likes" },
  { id: "yt-quit", platform: "youtube", blurred: false, title: "I QUIT MY JOB AND THIS HAPPENED 😱😱", channel: "Vlog Life", duration: "22:40", meta: "3.4M views · 4 days ago", thumb: { text: "I QUIT 😱", bg: "#E5352B", fg: "#FFF34F" } },
  { id: "li-graphs", platform: "linkedin", blurred: false, name: "Ana Costa", handle: "Software Engineer at Google", when: "1d", text: "Graph problems I got across 4 Google interview loops, and the one pattern behind all of them: turn the grid into an implicit graph, then BFS with state.", stats: "1,204 reactions · 86 comments" },
];

// Real answers for two of the hero X posts, shown in "How it works".
export const SAMPLE_ANSWERS = [
  { key: "v0", text: "This celebrity just DESTROYED the other one…", bait: 2.19, goal: 3.0, junk: 0.82, blurred: true },
  { key: "v1", text: "Go 1.26 is out: generic type aliases are stable…", bait: 0.03, goal: 0.78, junk: 0.03, blurred: false },
];

// Every item above, judged against HERO_GOAL (the "interviews" goal).
const ALL: Item[] = [...Object.values(HERO_FEEDS).flat(), ...GOAL_FEED];
export const ITEMS: Record<string, Item> = Object.fromEntries(ALL.map((i) => [i.id, i]));
const INTERVIEW_BLUR = new Set([...ALL.filter((i) => i.blurred).map((i) => i.id), ...GOALS.interviews.blurred]);
export const isNoise = (id: string) => INTERVIEW_BLUR.has(id);

// The hero wall: all 18 items, four columns, noise sprinkled through.
export const WALL: string[][] = [
  ["yt-3am", "x-airdrop", "li-postmortem", "yt-tikka", "x-go"],
  ["li-fired", "yt-dsa", "x-hashing", "yt-millionaire", "li-overload"],
  ["x-destroyed", "yt-urlshort", "li-graphs", "x-sourdough"],
  ["yt-quit", "li-synergy", "yt-tiny", "yt-physics"],
];
export const WALL_TOTAL = WALL.flat().length;
export const WALL_NOISE = WALL.flat().filter(isNoise).length;
