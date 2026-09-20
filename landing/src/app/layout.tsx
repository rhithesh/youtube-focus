import type { Metadata } from "next";
import { Archivo, Archivo_Black, Geist_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" className={`${archivo.variable} ${archivoBlack.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper text-ink">
        {children}
        <a
          href="https://www.buymeacoffee.com/rhithesh"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
            alt="Buy Me a Coffee"
            style={{ height: "60px", width: "217px" }}
          />
        </a>
      </body>
    </html>
  );
}
