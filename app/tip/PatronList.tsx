"use client";

import { useCallback, useEffect, useState } from "react";

type Patron = {
  address: string;
  contributions: Array<{ amount: string; network: string; symbol: string }>;
  latestAt: string;
  latestTransactionUrl: string;
  transfers: number;
};

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function PatronList() {
  const [patrons, setPatrons] = useState<Patron[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/patrons", { cache: "no-store" });
      const payload = await response.json() as { error?: string; patrons?: Patron[] };
      if (!response.ok || !payload.patrons) throw new Error(payload.error || "Patrons could not be loaded.");
      setPatrons(payload.patrons);
    } catch {
      setError("Patrons could not be loaded right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The public ledger is synchronized from an external indexer after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const onRefresh = () => void load();
    window.addEventListener("patrons:refresh", onRefresh);
    const interval = window.setInterval(onRefresh, 60_000);
    return () => {
      window.removeEventListener("patrons:refresh", onRefresh);
      window.clearInterval(interval);
    };
  }, [load]);

  return (
    <section className="patron-list" aria-labelledby="patron-heading">
      <div className="patron-heading">
        <h2 id="patron-heading">Patrons</h2>
        <button type="button" onClick={() => void load()} disabled={loading}>Refresh</button>
      </div>
      <p className="patron-intro">Successful public ETH and USDC transfers to the tip address since 17 July 2026</p>
      {loading && patrons.length === 0 ? <p className="patron-status">Reading the chain…</p> : null}
      {error ? <p className="patron-status" role="status">{error}</p> : null}
      {!loading && !error && patrons.length === 0 ? <p className="patron-status">The first verified tip will appear here</p> : null}
      {patrons.length > 0 ? (
        <ol>
          {patrons.map((patron) => (
            <li key={patron.address}>
              <a href={patron.latestTransactionUrl} target="_blank" rel="noreferrer">
                <span><strong>{shortAddress(patron.address)}</strong><time dateTime={patron.latestAt}>{dateFormatter.format(new Date(patron.latestAt))}</time></span>
                <span className="patron-contribution">
                  {patron.contributions.map((contribution) => `${contribution.amount} ${contribution.symbol}${contribution.network === "Ethereum" ? "" : ` · ${contribution.network}`}`).join(" + ")}
                  <small>{patron.transfers} {patron.transfers === 1 ? "tip" : "tips"} ↗</small>
                </span>
              </a>
            </li>
          ))}
        </ol>
      ) : null}
      <small className="patron-note">Wallet addresses and transfers are public on-chain. No personal identity is inferred.</small>
    </section>
  );
}
