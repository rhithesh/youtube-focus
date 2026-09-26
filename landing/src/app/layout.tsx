import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Feed Filter — your YouTube, X and LinkedIn feeds, minus the noise",
  description:
    "A Chrome extension that blurs clickbait, spam and off-goal posts on YouTube, X and LinkedIn, judged against goals you write yourself. Hover to see one. Nothing is ever deleted.",
  metadataBase: new URL("https://feedfilter.video"),
  openGraph: {
    title: "Feed Filter — your feeds, minus the noise",
    description:
      "Write your goals. Every post on the page is judged in one request. Clickbait, spam and distractions stay blurred until you hover.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrument.variable} h-full`}>
      <body className="min-h-full bg-paper text-ink">
        {children}
        <a
          href="https://www.buymeacoffee.com/rhithesh"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 z-50 sm:bottom-5 sm:right-5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
            alt="Buy Me a Coffee"
            className="h-10 w-auto sm:h-[52px]"
          />
        </a>
      </body>
    </html>
  );
}
