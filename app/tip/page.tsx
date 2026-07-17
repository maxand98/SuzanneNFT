import type { Metadata } from "next";
import DustSweep from "./DustSweep";
import PatronList from "./PatronList";

export const metadata: Metadata = {
  title: "Tip the writer",
  description: "Send SuzanneNFTs a one-time, wallet-to-wallet tip.",
  openGraph: {
    title: "Support the next essay",
    description: "Send SuzanneNFTs a one-time, wallet-to-wallet tip.",
    images: [{ url: "/tip-social.png", width: 1200, height: 630, alt: "Support the next essay." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Support the next essay",
    description: "Send SuzanneNFTs a one-time, wallet-to-wallet tip.",
    images: ["/tip-social.png"],
  },
};

export default function TipPage() {
  return (
    <main className="support-page">
      <header className="site-header support-header">
        <a className="wordmark" href="/" aria-label="Suzanne’s Threads, home">
          Suzanne’s Threads
        </a>
        <a href="/">← Back to essays</a>
      </header>

      <section className="support-shell" aria-labelledby="support-title">
        <h1 id="support-title">Tip the writer</h1>
        <div className="support-card" aria-label="Wallet tip">
          <DustSweep />
        </div>
        <PatronList />
      </section>
    </main>
  );
}
