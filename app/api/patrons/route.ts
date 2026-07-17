import { PATRON_LEDGER_START, TIP_RECIPIENT } from "../../../lib/site-config";

const recipient = TIP_RECIPIENT.toLowerCase();
const addressPattern = /^0x[0-9a-f]{40}$/;

const networks = [
  { name: "Ethereum", explorer: "https://eth.blockscout.com", usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
  { name: "Optimism", explorer: "https://optimism.blockscout.com", usdc: "0x0b2c639c533813f4aa9d7837caf62653d097ff85" },
  { name: "Base", explorer: "https://base.blockscout.com", usdc: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" },
  { name: "Arbitrum", explorer: "https://arbitrum.blockscout.com", usdc: "0xaf88d065e77c8cc2239327c5edb3a432268e5831" },
] as const;

type RpcTransfer = {
  contractAddress?: string;
  from?: string;
  hash?: string;
  isError?: string;
  timeStamp?: string;
  to?: string;
  tokenDecimal?: string;
  txreceipt_status?: string;
  value?: string;
};

type Donation = {
  address: string;
  decimals: number;
  hash: string;
  network: string;
  rawAmount: bigint;
  symbol: "ETH" | "USDC";
  timestamp: number;
  transactionUrl: string;
};

async function rpcTransfers(url: string) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Indexer request failed");
  const payload = await response.json() as { result?: unknown };
  return Array.isArray(payload.result) ? payload.result as RpcTransfer[] : [];
}

function validTransfer(item: RpcTransfer) {
  const from = item.from?.toLowerCase() ?? "";
  const to = item.to?.toLowerCase() ?? "";
  const timestamp = Number(item.timeStamp);
  return addressPattern.test(from)
    && to === recipient
    && /^0x[0-9a-f]{64}$/.test(item.hash?.toLowerCase() ?? "")
    && /^\d+$/.test(item.value ?? "")
    && BigInt(item.value ?? "0") > 0n
    && Number.isInteger(timestamp)
    && timestamp >= PATRON_LEDGER_START;
}

function displayUnits(value: bigint, decimals: number) {
  const padded = value.toString().padStart(decimals + 1, "0");
  const whole = decimals ? padded.slice(0, -decimals) : padded;
  const fraction = decimals ? padded.slice(-decimals).replace(/0+$/, "").slice(0, 8) : "";
  return fraction ? `${whole}.${fraction}` : whole;
}

export async function GET() {
  const networkResults = await Promise.all(networks.map(async (network) => {
    try {
      const base = `${network.explorer}/api?module=account&address=${recipient}&page=1&offset=100&sort=desc`;
      const [nativeItems, usdcItems] = await Promise.all([
        rpcTransfers(`${base}&action=txlist`),
        rpcTransfers(`${base}&action=tokentx&contractaddress=${network.usdc}`),
      ]);

      const native: Donation[] = nativeItems
        .filter((item) => validTransfer(item) && item.isError !== "1" && item.txreceipt_status !== "0")
        .map((item) => ({
          address: item.from!.toLowerCase(),
          decimals: 18,
          hash: item.hash!.toLowerCase(),
          network: network.name,
          rawAmount: BigInt(item.value!),
          symbol: "ETH",
          timestamp: Number(item.timeStamp),
          transactionUrl: `${network.explorer}/tx/${item.hash}`,
        }));
      const usdc: Donation[] = usdcItems
        .filter((item) => validTransfer(item) && item.contractAddress?.toLowerCase() === network.usdc)
        .map((item) => ({
          address: item.from!.toLowerCase(),
          decimals: 6,
          hash: item.hash!.toLowerCase(),
          network: network.name,
          rawAmount: BigInt(item.value!),
          symbol: "USDC",
          timestamp: Number(item.timeStamp),
          transactionUrl: `${network.explorer}/tx/${item.hash}`,
        }));
      return [...native, ...usdc];
    } catch {
      return [] as Donation[];
    }
  }));

  const donations = networkResults.flat().sort((a, b) => b.timestamp - a.timestamp);
  const grouped = new Map<string, {
    address: string;
    latest: Donation;
    totals: Map<string, { decimals: number; network: string; rawAmount: bigint; symbol: "ETH" | "USDC" }>;
    transfers: number;
  }>();

  for (const donation of donations) {
    const patron = grouped.get(donation.address) ?? {
      address: donation.address,
      latest: donation,
      totals: new Map(),
      transfers: 0,
    };
    const key = `${donation.network}:${donation.symbol}`;
    const total = patron.totals.get(key) ?? {
      decimals: donation.decimals,
      network: donation.network,
      rawAmount: 0n,
      symbol: donation.symbol,
    };
    total.rawAmount += donation.rawAmount;
    patron.totals.set(key, total);
    patron.transfers += 1;
    if (donation.timestamp > patron.latest.timestamp) patron.latest = donation;
    grouped.set(donation.address, patron);
  }

  const patrons = [...grouped.values()]
    .sort((a, b) => b.latest.timestamp - a.latest.timestamp)
    .slice(0, 20)
    .map((patron) => ({
      address: patron.address,
      contributions: [...patron.totals.values()].map((total) => ({
        amount: displayUnits(total.rawAmount, total.decimals),
        network: total.network,
        symbol: total.symbol,
      })),
      latestAt: new Date(patron.latest.timestamp * 1000).toISOString(),
      latestTransactionUrl: patron.latest.transactionUrl,
      transfers: patron.transfers,
    }));

  return Response.json({ patrons }, {
    headers: { "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" },
  });
}
