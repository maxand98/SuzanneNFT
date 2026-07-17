const addressPattern = /^0x[0-9a-fA-F]{40}$/;

const explorers: Record<string, string> = {
  "0x1": "https://eth.blockscout.com",
  "0xa": "https://optimism.blockscout.com",
  "0x2105": "https://base.blockscout.com",
  "0xa4b1": "https://arbitrum.blockscout.com",
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
  const explorer = explorers[chainId];

  if (!addressPattern.test(address) || !explorer) {
    return Response.json({ error: "This wallet or network is not supported." }, { status: 400 });
  }

  try {
    const response = await fetch(`${explorer}/api/v2/addresses/${address}/token-balances`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Indexer returned ${response.status}`);
    const balances = await response.json() as BlockscoutBalance[];

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
          name: safeText(token?.name, "Token"),
          symbol: safeText(token?.symbol, "TOKEN").slice(0, 16),
          usdValue,
        }];
      })
      .sort((a, b) => b.usdValue - a.usdValue)
      .slice(0, 100);

    return Response.json({ tokens }, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "Wallet balances could not be loaded. Try again." }, { status: 502 });
  }
}
