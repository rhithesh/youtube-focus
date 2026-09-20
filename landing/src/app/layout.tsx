import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Feed Filter — goal-aligned YouTube",
  description:
    "A Chrome extension that frosts over clickbait, spam and off-goal YouTube videos, judged against goals you write yourself. Hover to peek. Nothing is ever deleted.",
  metadataBase: new URL("https://feedfilter.video"),
  openGraph: {
    title: "Feed Filter — goal-aligned YouTube",
    description:
      "Write your goals. Jev judges every listing in one request. Clickbait, spam and distractions frost over until you hover.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper text-ink">{children}</body>
    </html>
  );
}
