import type { Metadata } from "next";
import Image from "next/image";

const ethAddress = "0xd2C264469C4Bcf2D1e04F4779A93765Abd94E203";

export const metadata: Metadata = {
  title: "Tip the writer",
  description: "Support SuzanneNFTs’ independent writing on digital art.",
  openGraph: {
    title: "Keep good ideas in circulation",
    description: "Tip SuzanneNFTs and support more independent writing on digital art.",
    images: [{ url: "/tip-social.png", width: 1200, height: 630, alt: "Keep good ideas in circulation. Tip the writer." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keep good ideas in circulation",
    description: "Tip SuzanneNFTs and support more independent writing on digital art.",
    images: ["/tip-social.png"],
  },
};

export default function TipPage() {
  return (
    <main className="tip-page">
      <header className="site-header tip-header">
        <a className="wordmark" href="/" aria-label="Suzanne’s Threads, home">
          Suzanne’s Threads
        </a>
        <a href="/">← Back to essays</a>
      </header>

      <section className="tip-hero" aria-labelledby="tip-title">
        <div className="tip-hero-copy">
          <p className="kicker">Reader-supported writing</p>
          <h1 id="tip-title">
            <span>Keep good ideas</span>
            <em>in circulation.</em>
          </h1>
          <p className="tip-deck">
            Suzanne turns research, taste, and time into essays anyone can read.
            A tip is a small vote for the next one—and helps keep the archive open
            for the reader who arrives after you.
          </p>
        </div>
        <div className="tip-profile" aria-label="About the writer">
          <Image
            unoptimized
            src="/suzanne-pfp.jpg"
            alt="CryptoPunk #6573, SuzanneNFTs’ profile picture"
            width="160"
            height="160"
            priority
          />
          <p><strong>39 essays</strong><br />No subscription. No paywall.</p>
        </div>
      </section>

      <section className="support-logic" aria-labelledby="why-tip">
        <div>
          <p className="kicker">Why tip?</p>
          <h2 id="why-tip">Free culture still costs someone time.</h2>
        </div>
        <ol>
          <li>
            <span>01</span>
            <h3>You received value first.</h3>
            <p>Tip only if an essay taught you something, changed your taste, or sent you toward an artist.</p>
          </li>
          <li>
            <span>02</span>
            <h3>Your signal compounds.</h3>
            <p>When readers reward careful work, careful work becomes more rational to produce.</p>
          </li>
          <li>
            <span>03</span>
            <h3>The next reader benefits.</h3>
            <p>Voluntary support keeps the writing open—even for people who cannot contribute.</p>
          </li>
        </ol>
      </section>

      <section className="tip-panel" aria-labelledby="send-tip">
        <div className="tip-panel-copy">
          <p className="kicker">One voluntary move</p>
          <h2 id="send-tip">Tip the writer in ETH.</h2>
          <p>
            You choose the amount in your wallet. Nothing is charged by this site,
            and there is no recurring payment.
          </p>
          <a
            className="wallet-button"
            href={`ethereum:${ethAddress}`}
            aria-label={`Open a wallet to tip SuzanneNFTs at ${ethAddress}`}
          >
            Open wallet <span>↗</span>
          </a>
          <p className="address-line">
            Recipient:{" "}
            <a href={`https://etherscan.io/address/${ethAddress}`} target="_blank" rel="noreferrer">
              {ethAddress.slice(0, 8)}…{ethAddress.slice(-4)} ↗
            </a>
          </p>
        </div>
        <aside className="tip-promise">
          <p>After tipping, the useful feeling is simple:</p>
          <blockquote>“I helped make the next essay possible.”</blockquote>
          <small>No leaderboard. No guilt. The work is the reward.</small>
        </aside>
      </section>

      <section className="dust-section" id="dust" aria-labelledby="dust-title">
        <div className="dust-intro">
          <p className="kicker">Mechanism concept</p>
          <h2 id="dust-title">Turn wallet dust into words.</h2>
          <p>
            Small airdrops and leftover token balances are often worth too little to
            manage one by one. A future dust sweep could bundle selected balances,
            convert what has safe liquidity, and send the result as one tip.
          </p>
        </div>
        <div className="dust-flow" aria-label="Proposed dust tipping flow">
          <div><span>1</span><strong>Scan</strong><p>Read token balances without moving anything.</p></div>
          <div><span>2</span><strong>Select</strong><p>You choose every token and set a value cap.</p></div>
          <div><span>3</span><strong>Preview</strong><p>See routes, price impact, approvals, gas, and the final tip.</p></div>
          <div><span>4</span><strong>Approve</strong><p>Sign explicitly; unsupported or suspicious tokens stay untouched.</p></div>
        </div>
        <div className="dust-status">
          <span>Safety gate</span>
          <p>
            This feature is a design proposal, not an active wallet connection. It
            should launch only after contract review, simulation, allowance limits,
            and protection against malicious airdropped tokens.
          </p>
        </div>
      </section>

    </main>
  );
}
