const addressPattern = /^0x[0-9a-fA-F]{40}$/;

const networks: Record<string, { explorer: string; usdc: string }> = {
  "0x1": { explorer: "https://eth.blockscout.com", usdc: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
  "0xa": { explorer: "https://optimism.blockscout.com", usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" },
  "0x2105": { explorer: "https://base.blockscout.com", usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  "0xa4b1": { explorer: "https://arbitrum.blockscout.com", usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
};

type BlockscoutBalance = {
  token?: {
    address_hash?: string;
    decimals?: string;
    exchange_rate?: string | null;
    icon_url?: string | null;
    name?: string;
    reputation?: string;
    symbol?: string;
    type?: string;
  };
  value?: string;
};

function safeText(value: unknown, fallback: string) {
  return typeof value === "string" ? value.replace(/[<>]/g, "").trim().slice(0, 40) || fallback : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address") ?? "";
  const chainId = (searchParams.get("chainId") ?? "").toLowerCase();
  const network = networks[chainId];

  if (!addressPattern.test(address) || !network) {
    return Response.json({ error: "This wallet or network is not supported." }, { status: 400 });
  }

  try {
    const [tokenResponse, addressResponse] = await Promise.all([
      fetch(`${network.explorer}/api/v2/addresses/${address}/token-balances`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      }),
      fetch(`${network.explorer}/api/v2/addresses/${address}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      }),
    ]);
    if (!tokenResponse.ok || !addressResponse.ok) throw new Error("Indexer request failed");
    const balances = await tokenResponse.json() as BlockscoutBalance[];
    const native = await addressResponse.json() as { coin_balance?: string; exchange_rate?: string };

    const tokens = balances
      .filter((item) => item.token?.type === "ERC-20" && item.token.reputation !== "scam")
      .flatMap((item) => {
        const token = item.token;
        const addressHash = token?.address_hash ?? "";
        const rawBalance = item.value ?? "";
        const decimals = Number(token?.decimals);
        const price = Number(token?.exchange_rate);
        if (!addressPattern.test(addressHash) || !/^\d+$/.test(rawBalance) || !Number.isInteger(decimals) || decimals < 0 || decimals > 255) return [];
        if (!Number.isFinite(price) || price <= 0 || rawBalance === "0") return [];
        const displayBalance = Number(rawBalance) / 10 ** decimals;
        const usdValue = displayBalance * price;
        if (!Number.isFinite(usdValue) || usdValue < 0.005) return [];
        const iconUrl = typeof token?.icon_url === "string" && token.icon_url.startsWith("https://") ? token.icon_url : "";
        return [{
          address: addressHash,
          balance: rawBalance,
          decimals,
          iconUrl,
          kind: "erc20" as const,
          name: safeText(token?.name, "Token"),
          symbol: safeText(token?.symbol, "TOKEN").slice(0, 16),
          usdValue,
        }];
      })
      .sort((a, b) => b.usdValue - a.usdValue)
      .slice(0, 100);

    const nativeBalance = /^\d+$/.test(native.coin_balance ?? "") ? native.coin_balance! : "0";
    const nativePrice = Number(native.exchange_rate);
    const nativeUsd = (Number(nativeBalance) / 1e18) * (Number.isFinite(nativePrice) ? nativePrice : 0);
    const nativeToken = {
      address: "native",
      balance: nativeBalance,
      decimals: 18,
      iconUrl: "",
      kind: "native" as const,
      name: "Ethereum",
      symbol: "ETH",
      usdValue: Number.isFinite(nativeUsd) ? nativeUsd : 0,
    };

    const usdcIndex = tokens.findIndex((token) => token.address.toLowerCase() === network.usdc.toLowerCase());
    const usdcToken = usdcIndex >= 0
      ? tokens.splice(usdcIndex, 1)[0]
      : {
          address: network.usdc,
          balance: "0",
          decimals: 6,
          iconUrl: "",
          kind: "erc20" as const,
          name: "USD Coin",
          symbol: "USDC",
          usdValue: 0,
        };

    return Response.json({ tokens: [nativeToken, usdcToken, ...tokens] }, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "Wallet balances could not be loaded. Try again." }, { status: 502 });
  }
}
