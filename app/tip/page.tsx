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
          <p className="kicker">Reader-supported writing</p>
          <h1 id="support-title">Tip the writer.</h1>
          <p className="support-lede">
            Help Suzanne keep thoughtful writing about digital art open to everyone.
          </p>

          <div className="support-profile" aria-label="About the writer">
            <Image
              unoptimized
              src="/suzanne-pfp.jpg"
              alt="CryptoPunk profile picture used by SuzanneNFTs"
              width="76"
              height="76"
              priority
            />
            <p><strong>SuzanneNFTs</strong><br />39 essays · no paywall</p>
          </div>

          <ul className="support-promises" aria-label="How tipping works">
            <li>One time</li>
            <li>Wallet to wallet</li>
            <li>You approve every token</li>
          </ul>
        </div>

        <div className="support-card" aria-labelledby="direct-support-title">
          <div className="support-card-heading">
            <p className="kicker">Use what is already in your wallet</p>
            <h2 id="direct-support-title">Turn token dust into the next essay.</h2>
            <p>Connect, add a token balance, then review it before anything is sent.</p>
          </div>
          <DustSweep />
          <p className="support-fineprint">No account. No subscription. No intermediary.</p>
        </div>
      </section>
    </main>
  );
}
