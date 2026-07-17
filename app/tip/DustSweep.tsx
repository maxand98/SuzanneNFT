"use client";

import { useEffect, useMemo, useState } from "react";

const recipient = "0xd2C264469C4Bcf2D1e04F4779A93765Abd94E203";

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
  kind: "erc20" | "native";
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
  const fraction = padded.slice(-decimals).replace(/0+$/, "").slice(0, 8);
  return fraction ? `${whole}.${fraction}` : whole;
}

function amountForUsd(token: DustToken, targetUsd: number) {
  if (token.usdValue <= 0 || targetUsd <= 0) return 0n;
  const scale = 1_000_000_000n;
  const scaledRatio = BigInt(Math.floor(Math.min(targetUsd / token.usdValue, 1) * Number(scale)));
  return token.balance * scaledRatio / scale;
}

function formatUsd(value: number) {
  if (value > 0 && value < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function parseUnitsInput(value: string, decimals: number) {
  if (!/^\d*(?:\.\d*)?$/.test(value) || !value || value === ".") return 0n;
  const [whole = "0", fraction = ""] = value.split(".");
  if (fraction.length > decimals) return 0n;
  return BigInt(`${whole || "0"}${fraction.padEnd(decimals, "0")}`);
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
  const [percentage, setPercentage] = useState<50 | 75 | 100 | null>(50);
  const [usdPreset, setUsdPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dustOpen, setDustOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedTransfer[]>([]);

  const selected = useMemo(() => tokens.filter((token) => token.selected), [tokens]);
  const selectedToken = selected[0];
  const selectedAmount = useMemo(() => {
    if (!selectedToken) return 0n;
    return percentage === null
      ? parseUnitsInput(customAmount, selectedToken.decimals)
      : selectedToken.balance * BigInt(percentage) / 100n;
  }, [customAmount, percentage, selectedToken]);
  const selectedUsd = selectedToken && selectedToken.balance > 0n
    ? selectedToken.usdValue * Number(selectedAmount) / Number(selectedToken.balance)
    : 0;
  const amountIsValid = Boolean(selectedToken && selectedAmount > 0n && selectedAmount <= selectedToken.balance);

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
      const mapped = payload.tokens.map((token) => ({ ...token, balance: BigInt(token.balance), selected: false }));
      const preferred = mapped.findIndex((token) => token.symbol === "ETH" && token.balance > 0n);
      const fallback = mapped.findIndex((token) => token.balance > 0n);
      const selectedIndex = preferred >= 0 ? preferred : fallback;
      setTokens(mapped.map((token, index) => ({ ...token, selected: index === selectedIndex })));
      setPercentage(50);
      setUsdPreset(null);
      setCustomAmount("");
      setPickerOpen(false);
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
    setSubmitted([]);
    const completed: SubmittedTransfer[] = [];

    try {
      for (let index = 0; index < selected.length; index += 1) {
        const token = selected[index];
        let amount = selectedAmount;
        if (token.kind === "native" && percentage === 100) {
          const [rawGas, rawGasPrice] = await Promise.all([
            activeProvider.request({ method: "eth_estimateGas", params: [{ from: account, to: recipient, value: "0x0" }] }),
            activeProvider.request({ method: "eth_gasPrice" }),
          ]);
          if (typeof rawGas !== "string" || typeof rawGasPrice !== "string") throw new Error("Network fee could not be estimated.");
          const reserve = BigInt(rawGas) * BigInt(rawGasPrice) * 12n / 10n;
          if (token.balance <= reserve) throw new Error("Balance is too low to cover the network fee.");
          amount = token.balance - reserve;
        }
        if (amount <= 0n) throw new Error("Select an asset with a balance.");
        const result = await activeProvider.request({
          method: "eth_sendTransaction",
          params: [token.kind === "native" ? {
            from: account,
            to: recipient,
            value: `0x${amount.toString(16)}`,
          } : {
            data: encodeTransferCall(recipient, amount),
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
      window.setTimeout(() => window.dispatchEvent(new Event("patrons:refresh")), 12_000);
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
    }
  }

  return (
    <div className="dust-sweep">
      {!account && (
        <div className="dust-connect">
          <div className="dust-connect-copy">
            <p>
              Connect a wallet to choose ETH, USDC, or a small token balance.
              Nothing is sent until you review it.
            </p>
          </div>
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

          {loadingTokens ? <p className="dust-empty dust-loading">Loading wallet balances…</p> : selectedToken && (
            <div className="dust-amount-card" aria-label="Donation amount">
              <div className="dust-amount-label">You tip</div>
              <div className="dust-amount-row">
                <input
                  aria-label={`Amount in ${selectedToken.symbol}`}
                  inputMode="decimal"
                  value={percentage === null ? customAmount : formatUnits(selectedAmount, selectedToken.decimals)}
                  placeholder="0"
                  onChange={(event) => {
                    const next = event.target.value;
                    if (/^\d*(?:\.\d*)?$/.test(next)) {
                      setCustomAmount(next);
                      setPercentage(null);
                      setUsdPreset(null);
                      setReviewing(false);
                    }
                  }}
                />
                <button className="dust-asset-button" type="button" onClick={() => setPickerOpen(true)} disabled={submitted.length > 0}>
                  <span className="dust-token-fallback" aria-hidden="true">{selectedToken.symbol.slice(0, 1)}</span>
                  {selectedToken.symbol} <span aria-hidden="true">⌄</span>
                </button>
              </div>
              <div className="dust-amount-meta">
                <span>{formatUsd(selectedUsd)} estimated</span>
                <span>Balance {formatUnits(selectedToken.balance, selectedToken.decimals)} {selectedToken.symbol}</span>
              </div>
              <div className="dust-amount-controls">
                <div className="dust-dollar-presets" aria-label="Preset tip amount">
                  {[{ label: "10¢", value: 0.1 }, { label: "$1", value: 1 }, { label: "$5", value: 5 }].map((preset) => (
                    <button key={preset.value} type="button" className={usdPreset === preset.value ? "is-active" : ""} aria-pressed={usdPreset === preset.value} disabled={selectedToken.usdValue < preset.value} onClick={() => {
                      const amount = amountForUsd(selectedToken, preset.value);
                      setCustomAmount(formatUnits(amount, selectedToken.decimals));
                      setPercentage(null);
                      setUsdPreset(preset.value);
                      setReviewing(false);
                    }}>{preset.label}</button>
                  ))}
                </div>
                <div className="dust-percentages" aria-label="Percentage of balance">
                  {[50, 75, 100].map((value) => (
                    <button key={value} type="button" className={percentage === value ? "is-active" : ""} aria-pressed={percentage === value} onClick={() => {
                      setPercentage(value as 50 | 75 | 100);
                      setUsdPreset(null);
                      setCustomAmount("");
                      setReviewing(false);
                    }}>{value === 100 ? "Max" : `${value}%`}</button>
                  ))}
                </div>
              </div>
              {selectedToken.kind === "native" && percentage === 100 && <small>Max reserves the estimated network fee when sending.</small>}
              {percentage === null && selectedAmount > selectedToken.balance && <small className="dust-inline-error">Amount exceeds your balance.</small>}
            </div>
          )}

          {pickerOpen && (
            <div className="dust-picker" role="dialog" aria-modal="true" aria-label="Select a token">
              <div className="dust-picker-heading">
                <div><strong>Select a token</strong><small>{chainDetails(chainId).name} balances only</small></div>
                <button type="button" aria-label="Close token picker" onClick={() => setPickerOpen(false)}>×</button>
              </div>
              <div className="dust-token-list" aria-live="polite">
                <ul>
                  {tokens.map((token) => (
                    <li key={token.address}>
                      <button type="button" disabled={token.balance === 0n} onClick={() => {
                        setTokens((current) => current.map((item) => ({ ...item, selected: item.address === token.address })));
                        setPercentage(50);
                        setUsdPreset(null);
                        setCustomAmount("");
                        setReviewing(false);
                        setSubmitted([]);
                        setPickerOpen(false);
                      }}>
                        <span className="dust-token-identity">
                          {token.iconUrl ? <img src={token.iconUrl} alt="" width="32" height="32" loading="lazy" /> : <span className="dust-token-fallback" aria-hidden="true">{token.symbol.slice(0, 1)}</span>}
                          <span><strong>{token.symbol}</strong><small>{formatUnits(token.balance, token.decimals)} · {token.name}</small></span>
                        </span>
                        <span className="dust-token-value"><strong>{formatUsd(token.usdValue)}</strong><small>{token.balance === 0n ? "no balance" : "estimated"}</small></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <button className="dust-refresh" type="button" onClick={() => loadTokens(account, chainId)}>Refresh balances</button>
            </div>
          )}

          {error && <p className="dust-error" role="alert">{error}</p>}

          <button
            className="dust-review-button"
            type="button"
            disabled={!amountIsValid || busy || submitted.length > 0}
            onClick={() => {
              setReviewing(true);
              setSubmitted([]);
            }}
          >
            {selectedToken ? `Review ${formatUsd(selectedUsd)} tip` : "Select a token"}
          </button>

              {reviewing && selectedToken && (
            <div className="dust-review" aria-live="polite">
              <strong>Direct wallet transfer</strong>
              <p>{formatUnits(selectedAmount, selectedToken.decimals)} {selectedToken.symbol} · {formatUsd(selectedUsd)}</p>
              <p><strong>Estimated total {formatUsd(selectedUsd)}</strong></p>
              <small>USD values are estimates and can change before the transfer confirms.</small>
              <p className="dust-recipient">Recipient <a href={chainDetails(chainId).explorer ? `${chainDetails(chainId).explorer}/address/${recipient}` : undefined} target="_blank" rel="noreferrer">{recipient}</a></p>
              {submitted.length === 0 && <small>No approvals. Nothing has been sent.</small>}
              <button className="dust-send-button" type="button" disabled={busy || submitted.length > 0} onClick={sendSelected}>
                {submitted.length > 0 ? "Submitted" : busy ? "Confirm in wallet" : `Send ${selectedToken.symbol}`}
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

              <div className="dust-donate-option">
                <button type="button" className="dust-donate-button" aria-expanded={dustOpen} onClick={() => setDustOpen((open) => !open)}>
                  Donate dust
                </button>
                <p>Combine eligible small balances into ETH or USDC, then tip the result.</p>
                {dustOpen && (
                  <div className="dust-donate-details">
                    <strong>Turn wallet fragments into one useful balance.</strong>
                    <p>Sweepr scans eligible tokens, previews the output, gas and slippage, then converts them without taking custody. It currently charges a 2% protocol fee.</p>
                    <small>External conversion service. It does not donate automatically; return here to tip the converted balance.</small>
                    <div>
                      <a href="https://app.sweepr.co/" target="_blank" rel="noreferrer">Open Sweepr ↗</a>
                      <button type="button" onClick={() => loadTokens(account, chainId)}>Refresh after converting</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
      <a
        className="dust-fans-link"
        href="https://kk.org/thetechnium/1000-true-fans/"
        target="_blank"
        rel="noreferrer"
      >
        because everyone needs 1000 true fans ↗
      </a>
    </div>
  );
}
