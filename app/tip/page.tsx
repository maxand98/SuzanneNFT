import type { Metadata } from "next";
import Image from "next/image";
import DustSweep from "./DustSweep";

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
        <div className="support-story">
          <h1 id="support-title">Tip the writer.</h1>

          <div className="support-profile" aria-label="About the writer">
            <Image
              unoptimized
              src="/suzanne-pfp.jpg"
              alt=""
              width="76"
              height="76"
              priority
            />
            <p><strong>SuzanneNFTs</strong><br />39 essays</p>
          </div>
        </div>

        <div className="support-card" aria-labelledby="direct-support-title">
          <div className="support-card-heading">
            <h2 id="direct-support-title">Send a tip.</h2>
            <p>Connect your wallet, choose a token, and review before sending.</p>
          </div>
          <DustSweep />
        </div>
      </section>
    </main>
  );
}
