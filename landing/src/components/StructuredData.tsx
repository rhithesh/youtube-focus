import { FAQS } from "@/lib/faq";
import { SITE, SITE_URL } from "@/lib/site";

// schema.org data for search engines: the site, the extension as a free browser app,
// and the FAQ exactly as it appears on the page.
export function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE.name,
        description: SITE.description,
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE.name,
        description: SITE.description,
        url: SITE_URL,
        applicationCategory: "BrowserApplication",
        applicationSubCategory: "Productivity",
        operatingSystem: "Chrome, Edge, Brave, Arc (Chromium)",
        softwareVersion: SITE.version,
        downloadUrl: `${SITE_URL}/feed-filter.zip`,
        installUrl: `${SITE_URL}/#install`,
        image: `${SITE_URL}/opengraph-image`,
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "Blurs clickbait, spam and off-goal posts on YouTube, X (Twitter) and LinkedIn",
          "Judged against goals you write in plain words",
          "Hover any blurred post to see it anyway",
          "Free tier, or bring your own OpenRouter key",
          "On/off switch on the page",
        ],
        author: { "@type": "Person", name: SITE.author.name, url: SITE.author.url },
        codeRepository: SITE.repo,
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
