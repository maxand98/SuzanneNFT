"use client";

import { useEffect, useMemo, useState } from "react";

const recipient = "0xd2C264469C4Bcf2D1e04F4779A93765Abd94E203";
const addressPattern = /^0x[0-9a-fA-F]{40}$/;

type RequestArguments = { method: string; params?: readonly unknown[] | object };
type EthereumProvider = {
  request(args: RequestArguments): Promise<unknown>;
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

type EIP6963ProviderDetail = {
  info: { name: string; rdns: string };
  provider: EthereumProvider;
};

type ProviderRpcError = Error & { code?: number };

type DustToken = {
  address: string;
  balance: bigint;
  decimals: number;
  iconUrl: string;
  name: string;
  selected: boolean;
  symbol: string;
  usdValue: number;
};

type SubmittedTransfer = {
  hash: string;
  symbol: string;
};

declare global {
  interface Window { ethereum?: EthereumProvider }
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function encodeTransferCall(address: string, amount: bigint) {
  return `0xa9059cbb${address.slice(2).toLowerCase().padStart(64, "0")}${amount.toString(16).padStart(64, "0")}`;
}

const chains: Record<string, { explorer: string; name: string }> = {
  "0x1": { explorer: "https://etherscan.io", name: "Ethereum" },
  "0xa": { explorer: "https://optimistic.etherscan.io", name: "Optimism" },
  "0x89": { explorer: "https://polygonscan.com", name: "Polygon" },
  "0x2105": { explorer: "https://basescan.org", name: "Base" },
  "0xa4b1": { explorer: "https://arbiscan.io", name: "Arbitrum" },
};

function chainDetails(chainId: string) {
  return chains[chainId.toLowerCase()] ?? {
    explorer: "",
    name: chainId ? `Chain ${parseInt(chainId, 16)}` : "Wallet network",
  };
}

function formatUnits(value: bigint, decimals: number) {
  if (decimals === 0) return value.toString();
  const padded = value.toString().padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "").slice(0, 6);
  return fraction ? `${whole}.${fraction}` : whole;
}

function formatUsd(value: number) {
  if (value > 0 && value < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function legacyMetaMaskProvider() {
  const injected = window.ethereum;
  if (!injected) return undefined;
  return injected.providers?.find((candidate) => candidate.isMetaMask) ?? (injected.isMetaMask ? injected : undefined);
}

export default function DustSweep() {
  const [provider, setProvider] = useState<EthereumProvider>();
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [tokens, setTokens] = useState<DustToken[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [submitted, setSubmitted] = useState<SubmittedTransfer[]>([]);

  const selected = useMemo(() => tokens.filter((token) => token.selected), [tokens]);
  const selectedUsd = useMemo(() => selected.reduce((total, token) => total + token.usdValue, 0), [selected]);

  useEffect(() => {
    const legacy = legacyMetaMaskProvider();
    if (legacy) setProvider(legacy);

    const onProvider = (event: Event) => {
      const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
      if (!detail?.provider) return;
      const isMetaMask = detail.info.rdns === "io.metamask" || detail.info.name.toLowerCase() === "metamask";
      if (isMetaMask) setProvider(detail.provider);
    };

    window.addEventListener("eip6963:announceProvider", onProvider);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onProvider);
  }, []);

  useEffect(() => {
    if (!provider) return;

    const sync = async () => {
      try {
        const [accounts, currentChain] = await Promise.all([
          provider.request({ method: "eth_accounts" }),
          provider.request({ method: "eth_chainId" }),
        ]);
        setAccount(Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "");
        setChainId(typeof currentChain === "string" ? currentChain : "");
      } catch {
        setError("MetaMask is available but could not be read. Unlock it and try again.");
      }
    };
    void sync();

    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0];
      setAccount(Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "");
      setTokens([]);
      setReviewing(false);
      setSubmitted([]);
    };
    const onChain = (...args: unknown[]) => {
      setChainId(typeof args[0] === "string" ? args[0] : "");
      setTokens([]);
      setReviewing(false);
      setSubmitted([]);
    };
    provider.on?.("accountsChanged", onAccounts);
    provider.on?.("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [provider]);

  async function loadTokens(walletAddress: string, network: string) {
    setLoadingTokens(true);
    setError("");
    setReviewing(false);
    setSubmitted([]);
    try {
      const response = await fetch(`/api/tokens?address=${encodeURIComponent(walletAddress)}&chainId=${encodeURIComponent(network)}`, {
        cache: "no-store",
      });
      const payload = await response.json() as {
        error?: string;
        tokens?: Array<Omit<DustToken, "balance" | "selected"> & { balance: string }>;
      };
      if (!response.ok || !payload.tokens) throw new Error(payload.error || "Wallet balances could not be loaded.");
      setTokens(payload.tokens.map((token) => ({ ...token, balance: BigInt(token.balance), selected: false })));
    } catch (caught) {
      setTokens([]);
      setError(caught instanceof Error ? caught.message : "Wallet balances could not be loaded. Try again.");
    } finally {
      setLoadingTokens(false);
    }
  }

  useEffect(() => {
    if (account && chainId) void loadTokens(account, chainId);
  }, [account, chainId]);

  async function connect() {
    const activeProvider = provider ?? legacyMetaMaskProvider();
    if (!activeProvider) {
      window.dispatchEvent(new Event("eip6963:requestProvider"));
      setError("MetaMask was not found. Make sure the extension is enabled for this site.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const existing = await activeProvider.request({ method: "eth_accounts" });
      const accounts = Array.isArray(existing) && existing.length > 0
        ? existing
        : await activeProvider.request({ method: "eth_requestAccounts" });
      const currentChain = await activeProvider.request({ method: "eth_chainId" });
      setAccount(Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "");
      setChainId(typeof currentChain === "string" ? currentChain : "");
      setProvider(activeProvider);
    } catch (caught) {
      const walletError = caught as ProviderRpcError;
      if (walletError.code === -32002) {
        setError("A MetaMask connection request is already open. Approve it in MetaMask, then try again.");
      } else if (walletError.code === 4001) {
        setError("Connection was declined in MetaMask.");
      } else {
        setError("MetaMask could not connect. Unlock the extension and try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function sendSelected() {
    const activeProvider = provider ?? legacyMetaMaskProvider();
    if (!activeProvider || !account || selected.length === 0) return;

    setBusy(true);
    setError("");
    setSendProgress(0);
    setSubmitted([]);
    const completed: SubmittedTransfer[] = [];

    try {
      for (let index = 0; index < selected.length; index += 1) {
        setSendProgress(index + 1);
        const token = selected[index];
        const result = await activeProvider.request({
          method: "eth_sendTransaction",
          params: [{
            data: encodeTransferCall(recipient, token.balance),
            from: account,
            to: token.address,
          }],
        });
        if (typeof result !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(result)) {
          throw new Error("Wallet did not return a transaction hash.");
        }
        completed.push({ hash: result, symbol: token.symbol });
        setSubmitted([...completed]);
      }
    } catch (caught) {
      const walletError = caught as ProviderRpcError;
      if (completed.length > 0) {
        setError(`${completed.length} of ${selected.length} transfers were submitted. The remaining transfers were not sent.`);
      } else if (walletError.code === 4001) {
        setError("Transfer was declined in MetaMask. Nothing was sent.");
      } else {
        setError("The wallet could not submit this transfer. Nothing was sent.");
      }
    } finally {
      setBusy(false);
      setSendProgress(0);
    }
  }

  return (
    <div className="dust-sweep">
      {!account && (
        <div className="dust-connect">
          <button type="button" onClick={connect} disabled={busy}>
            {busy ? "Connecting…" : "Connect wallet"}
          </button>
          {error && <p className="dust-error" role="alert">{error}</p>}
        </div>
      )}

      {account && (
        <>
          <div className="dust-toolbar">
            <div>
              <strong>{shortAddress(account)}</strong>
              <small>{chainDetails(chainId).name}</small>
            </div>
            <span className="dust-connected">Connected</span>
          </div>

          <div className="dust-picker-heading">
            <div><strong>Choose tokens</strong><small>Estimated market value</small></div>
            <button type="button" disabled={loadingTokens || busy || submitted.length > 0} onClick={() => loadTokens(account, chainId)}>Refresh</button>
          </div>

          <div className="dust-token-list" aria-live="polite" aria-busy={loadingTokens}>
            {loadingTokens ? (
              <p className="dust-empty">Loading wallet balances…</p>
            ) : tokens.length === 0 ? (
              <p className="dust-empty">No priced ERC-20 balances were found on {chainDetails(chainId).name}.</p>
            ) : (
              <ul>
                {tokens.map((token) => (
                  <li key={token.address}>
                    <label>
                      <input
                        type="checkbox"
                        checked={token.selected}
                        disabled={submitted.length > 0}
                        onChange={(event) => {
                          setTokens((current) => current.map((item) => item.address === token.address ? { ...item, selected: event.target.checked } : item));
                          setReviewing(false);
                          setSubmitted([]);
                        }}
                      />
                      <span className="dust-token-identity">
                        {token.iconUrl ? <img src={token.iconUrl} alt="" width="32" height="32" loading="lazy" /> : <span className="dust-token-fallback" aria-hidden="true">{token.symbol.slice(0, 1)}</span>}
                        <span><strong>{token.symbol}</strong><small>{formatUnits(token.balance, token.decimals)} · {token.name}</small></span>
                      </span>
                      <span className="dust-token-value"><strong>{formatUsd(token.usdValue)}</strong><small>estimated</small></span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="dust-error" role="alert">{error}</p>}

          <button
            className="dust-review-button"
            type="button"
            disabled={selected.length === 0 || busy || submitted.length > 0}
            onClick={() => {
              setReviewing(true);
              setSubmitted([]);
            }}
          >
            {selected.length > 0 ? `Review ${formatUsd(selectedUsd)} tip` : "Select tokens"}
          </button>

          {reviewing && (
            <div className="dust-review" aria-live="polite">
              <strong>{selected.length} direct {selected.length === 1 ? "transfer" : "transfers"}</strong>
              <ul>
                {selected.map((token) => (
                  <li key={token.address}>{formatUnits(token.balance, token.decimals)} {token.symbol} · {formatUsd(token.usdValue)}</li>
                ))}
              </ul>
              <p><strong>Estimated total {formatUsd(selectedUsd)}</strong></p>
              <small>USD values are estimates and can change before the transfer confirms.</small>
              <p className="dust-recipient">Recipient <a href={chainDetails(chainId).explorer ? `${chainDetails(chainId).explorer}/address/${recipient}` : undefined} target="_blank" rel="noreferrer">{recipient}</a></p>
              {submitted.length === 0 && <small>No approvals. Nothing has been sent.</small>}
              <button className="dust-send-button" type="button" disabled={busy || submitted.length > 0} onClick={sendSelected}>
                {submitted.length > 0 ? "Submitted" : busy ? `Confirm transfer ${sendProgress} of ${selected.length}` : `Send ${selected.length === 1 ? "token" : `${selected.length} tokens`}`}
              </button>
              {submitted.length > 0 && (
                <div className="dust-receipts" role="status">
                  <strong>{submitted.length === selected.length ? "Transfers submitted" : "Partially submitted"}</strong>
                  {submitted.map((transfer) => chainDetails(chainId).explorer ? (
                    <a key={transfer.hash} href={`${chainDetails(chainId).explorer}/tx/${transfer.hash}`} target="_blank" rel="noreferrer">View {transfer.symbol} transaction ↗</a>
                  ) : <span key={transfer.hash}>{transfer.symbol}: {shortAddress(transfer.hash)}</span>)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
