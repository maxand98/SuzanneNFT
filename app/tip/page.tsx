import type { Metadata } from "next";
import Image from "next/image";

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

      <section className="support-hero" aria-labelledby="support-title">
        <div className="support-intro">
          <p className="kicker">Independent writing</p>
          <h1 id="support-title">
            <span>Support the</span>
            <em>next essay.</em>
          </h1>
          <p>
            One-time, wallet-to-wallet. You choose the token and amount.
          </p>
        </div>

        <div className="support-profile" aria-label="About the writer">
          <Image
            unoptimized
            src="/suzanne-pfp.jpg"
            alt="CryptoPunk profile picture used by SuzanneNFTs"
            width="144"
            height="144"
            priority
          />
          <p><strong>SuzanneNFTs</strong><br />Digital art writer</p>
        </div>

        <div className="support-card" aria-labelledby="direct-support-title">
          <div>
            <p className="kicker">Direct support</p>
            <h2 id="direct-support-title">Send a one-time tip.</h2>
            <p>No account. No subscription. Funds go directly to Suzanne’s wallet.</p>
          </div>
          <div className="support-card-next" aria-label="Prototype status">
            <span>Step 2</span>
            <p>Token, network, and amount controls come next.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
