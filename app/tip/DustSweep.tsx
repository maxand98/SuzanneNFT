"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
  selected: boolean;
  symbol: string;
};

declare global {
  interface Window { ethereum?: EthereumProvider }
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function encodeAddressCall(selector: string, address: string) {
  return `${selector}${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

function decodeUint(value: unknown) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/.test(value)) throw new Error("Token returned invalid data.");
  return BigInt(value);
}

function decodeSymbol(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("0x")) return "TOKEN";
  const hex = value.slice(2);
  const decodeHex = (input: string) => {
    const bytes = new Uint8Array((input.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16)));
    return new TextDecoder().decode(bytes).replace(/\0+$/, "");
  };
  try {
    if (hex.length === 64) {
      return decodeHex(hex) || "TOKEN";
    }
    const length = Number(BigInt(`0x${hex.slice(64, 128)}`));
    return decodeHex(hex.slice(128, 128 + length * 2)) || "TOKEN";
  } catch {
    return "TOKEN";
  }
}

function formatUnits(value: bigint, decimals: number) {
  if (decimals === 0) return value.toString();
  const padded = value.toString().padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "").slice(0, 6);
  return fraction ? `${whole}.${fraction}` : whole;
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
  const [tokenInput, setTokenInput] = useState("");
  const [tokens, setTokens] = useState<DustToken[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const selected = useMemo(() => tokens.filter((token) => token.selected), [tokens]);

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
    };
    const onChain = (...args: unknown[]) => {
      setChainId(typeof args[0] === "string" ? args[0] : "");
      setTokens([]);
      setReviewing(false);
    };
    provider.on?.("accountsChanged", onAccounts);
    provider.on?.("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [provider]);

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

  async function addToken(event: FormEvent) {
    event.preventDefault();
    const activeProvider = provider ?? legacyMetaMaskProvider();
    const address = tokenInput.trim();
    if (!activeProvider || !account) return;
    if (!addressPattern.test(address)) {
      setError("Enter a valid ERC-20 contract address.");
      return;
    }
    if (tokens.some((token) => token.address.toLowerCase() === address.toLowerCase())) {
      setError("That token is already in the list.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const code = await activeProvider.request({ method: "eth_getCode", params: [address, "latest"] });
      if (code === "0x" || code === "0x0") throw new Error("Not a contract");
      const [rawBalance, rawDecimals, rawSymbol] = await Promise.all([
        activeProvider.request({ method: "eth_call", params: [{ to: address, data: encodeAddressCall("0x70a08231", account) }, "latest"] }),
        activeProvider.request({ method: "eth_call", params: [{ to: address, data: "0x313ce567" }, "latest"] }),
        activeProvider.request({ method: "eth_call", params: [{ to: address, data: "0x95d89b41" }, "latest"] }),
      ]);
      const balance = decodeUint(rawBalance);
      const decimals = Number(decodeUint(rawDecimals));
      if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error("Bad decimals");
      if (balance === 0n) throw new Error("Zero balance");
      setTokens((current) => [...current, { address, balance, decimals, selected: true, symbol: decodeSymbol(rawSymbol).slice(0, 16) }]);
      setTokenInput("");
      setReviewing(false);
    } catch {
      setError("This contract did not return a usable ERC-20 balance on the connected network.");
    } finally {
      setBusy(false);
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
              <small>{chainId ? `Network ${parseInt(chainId, 16)}` : "Wallet network"}</small>
            </div>
            <span className="dust-connected">Connected</span>
          </div>

          <form className="dust-token-form" onSubmit={addToken}>
            <label htmlFor="token-address">Token contract</label>
            <div>
              <input
                id="token-address"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="0x…"
                autoComplete="off"
                spellCheck="false"
                disabled={busy}
              />
              <button type="submit" disabled={busy || !tokenInput.trim()}>Add token</button>
            </div>
          </form>

          <div className="dust-token-list" aria-live="polite">
            {tokens.length === 0 ? (
              <p className="dust-empty">Add a token to see your balance.</p>
            ) : (
              <ul>
                {tokens.map((token) => (
                  <li key={token.address}>
                    <label>
                      <input
                        type="checkbox"
                        checked={token.selected}
                        onChange={(event) => {
                          setTokens((current) => current.map((item) => item.address === token.address ? { ...item, selected: event.target.checked } : item));
                          setReviewing(false);
                        }}
                      />
                      <span><strong>{formatUnits(token.balance, token.decimals)} {token.symbol}</strong><small>{shortAddress(token.address)}</small></span>
                    </label>
                    <button type="button" onClick={() => setTokens((current) => current.filter((item) => item.address !== token.address))}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="dust-error" role="alert">{error}</p>}

          <button
            className="dust-review-button"
            type="button"
            disabled={selected.length === 0}
            onClick={() => setReviewing(true)}
          >
            Review tip
          </button>

          {reviewing && (
            <div className="dust-review" aria-live="polite">
              <strong>{selected.length} direct {selected.length === 1 ? "transfer" : "transfers"}</strong>
              <p>Recipient {shortAddress(recipient)}</p>
              <small>No approvals. Nothing has been sent.</small>
            </div>
          )}
        </>
      )}
    </div>
  );
}
