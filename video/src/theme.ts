import { loadFont } from "@remotion/fonts";
import { Easing, staticFile } from "remotion";

export const C = {
  paper: "#f3f0e8",
  card: "#ffffff",
  ink: "#16150f",
  muted: "#6b665b",
  line: "#e1dbcd",
  lime: "#c9f25d",
  night: "#16150f",
  night2: "#22211a",
};

export const SERIF = "Instrument Serif";
export const SANS = "Geist";

for (const f of [
  { family: SERIF, url: "fonts/InstrumentSerif-Regular.ttf", weight: "400", style: "normal" },
  { family: SERIF, url: "fonts/InstrumentSerif-Italic.ttf", weight: "400", style: "italic" },
  { family: SANS, url: "fonts/Geist-Regular.ttf", weight: "400", style: "normal" },
  { family: SANS, url: "fonts/Geist-Medium.ttf", weight: "500", style: "normal" },
  { family: SANS, url: "fonts/Geist-SemiBold.ttf", weight: "600", style: "normal" },
]) {
  loadFont({ ...f, url: staticFile(f.url) });
}

export const EASE = Easing.bezier(0.2, 0.7, 0.2, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
