# Design Review & Build Spec — /tip page (suzannnenfts.com)

Reviewed: 2026-07-17 · Live site + repo (`app/tip/page.tsx`, `app/tip/DustSweep.tsx`, `app/globals.css`)
Purpose: handoff document for implementation agents. Each workstream (WS1–WS6) is independently assignable.

---

## 1. Executive summary

The page looks good but cannot collect money. The visual design is strong and on-brand (editorial split layout, ink card, orange CTA, CryptoPunk identity). The contribution mechanics are non-functional: the flow supports only a single injected `window.ethereum` provider, requires users to paste raw ERC-20 contract addresses, and — critically — **has no send step**. "Review tip" dead-ends at a summary panel ("Nothing has been sent") with no transaction execution anywhere in the code. Current conversion rate is structurally 0%.

Recommendation: keep the visual shell, replace the wallet/payment engine. Adopt **Privy (+ wagmi)** as the single connection layer — it covers MetaMask, Rabby, and all injected wallets via EIP-6963, mobile wallets via WalletConnect, embedded wallets for non-crypto users, and card funding. Privy is a Stripe company (acquired June 2025), so the Privy + Stripe card path is one vendor relationship, not two. Rebuild "Collect Dust" around automatic balance discovery and batched execution instead of manual address entry.

---

## 2. Current state audit

**Stack:** Next.js 15 (vinext) on Cloudflare Workers, Tailwind v4 via custom CSS, D1 available but schema empty (`db/schema.ts` intentionally blank). No wallet libraries — raw EIP-1193 calls.

**What exists and works**
- Clean SSR page with good OG/Twitter metadata (`/tip-social.png`, correct titles).
- Wallet connect via `eth_requestAccounts`; listens to `accountsChanged`/`chainChanged` correctly.
- Manual ERC-20 addition with sensible validation: `eth_getCode` contract check, balance/decimals/symbol reads via `eth_call`, zero-balance and duplicate rejection, symbol decode hardened against malformed returns.
- Approval-free model (direct `transfer()` intent) — good security posture, worth preserving as a principle.
- ARIA basics present (`role="alert"`, `aria-live`, labelled sections).

**What's broken or missing (ranked)**

| # | Severity | Finding |
|---|----------|---------|
| 1 | P0 | **No transaction is ever sent.** No `eth_sendTransaction` in the codebase. Review panel is the end of the funnel. |
| 2 | P0 | **Single injected provider only.** `window.ethereum` race: users with MetaMask + Rabby installed get whichever injected last (no EIP-6963). No WalletConnect → mobile Safari/Chrome users (no injected wallet) hit "No compatible browser wallet was found" — a dead end for likely >50% of X-referred mobile traffic. |
| 3 | P1 | **Manual token entry.** Users must find and paste ERC-20 contract addresses. Nobody tipping $5 will do this. Also a safety hazard (typo-squatted token addresses). |
| 4 | P1 | **No simple tip path.** No native ETH/USDC option, no preset amounts. The dust sweep IS the tip flow — dust should be the secondary, playful option, not the only one. |
| 5 | P1 | **No fiat path.** No card option for the majority of readers who don't hold crypto. |
| 6 | P1 | **Gas economics ignored.** N tokens = N mainnet transactions. Gas will routinely exceed dust value; no chain guidance, no L2 default, chain shown as raw number ("Network 1"). |
| 7 | P2 | **Trust cues absent.** Recipient hardcoded (`0xd2C2…E203`), shown only truncated, no ENS, no Etherscan link, no proof it belongs to Suzanne. No thank-you state, no receipt, no social proof (recent tips / supporter count). |
| 8 | P2 | **Micro-typography fails usability.** 8px Remove button, 9px review text, 11px mono metadata; touch targets well under the 24px minimum (WCAG 2.5.8). Checkbox rows are the only selection affordance. |
| 9 | P3 | Muted-on-ink text (`#898881` on `#171715`, 5.05:1) technically passes AA, but at 8–11px sizes legibility fails in practice. Increase size rather than color. |
| 10 | P3 | 651–900px range: `minmax(420px,1fr)` card column gets tight; verify no overflow at ~700px. |

---

## 3. Target architecture

```
┌────────────────────────── /tip ──────────────────────────┐
│  Tab A: "Send a tip" (default)   Tab B: "Sweep your dust"│
│                                                          │
│  Privy SDK (auth + wallets)  ──  wagmi/viem (tx layer)   │
│    ├─ Injected wallets via EIP-6963 (MetaMask, Rabby,    │
│    │  Coinbase Ext, Zerion, …)                           │
│    ├─ WalletConnect (mobile deep-link)                   │
│    ├─ Embedded wallet (email/social login, no extension) │
│    └─ Funding: card → embedded wallet (Privy/Stripe)     │
│                                                          │
│  Fiat-only fallback: Stripe Payment Link / Checkout      │
│  (USDC settlement toggle available to US merchants)      │
│                                                          │
│  Balance discovery: Alchemy/Zerion token API (server-side │
│  key in CF Worker, cached)                               │
│  Swaps (dust→ETH/USDC): 0x or LiFi aggregator API,       │
│  executed client-side from the user's wallet             │
│  Receipts/social proof: D1 (tips table) + on-chain verify│
└──────────────────────────────────────────────────────────┘
```

**Why Privy over RainbowKit/Reown AppKit:** all three solve wallet pickers with EIP-6963 + WalletConnect. Only Privy adds embedded wallets + card funding under the Stripe umbrella — which this brief explicitly wants. RainbowKit is the fallback if the fiat requirement is dropped (lighter, no vendor account).

**Chain strategy:** default to **Base** (cheap, Coinbase onramp-friendly, Sweepr-style gasless sweeps exist there); support Mainnet, Arbitrum, Optimism, Polygon. Auto-prompt `wallet_switchEthereumChain`. Never let a user attempt a $3 tip on mainnet without a fee warning.

**Recipient identity:** register an ENS (e.g. `suzannenfts.eth`), point it at the tip address, display both, link to Etherscan, and have Suzanne pin/post the address on X. This is the single cheapest trust upgrade available.

---

## 4. Tip flow (Tab A) — conversion mechanics

The mechanics that actually move tip conversion, in priority order:

1. **Preset USD-denominated chips**: $3 / $5 / $10 / custom (USD framing, converted live to token amount). Default-select $5. Anchoring beats blank inputs by a wide margin.
2. **One-line value proposition above the button** (already good: "39 essays · no paywall" — add "Tips are the only revenue").
3. **Token choice: ETH or USDC only** in the simple path. More choices = fewer completions.
4. **Progressive disclosure**: page renders fully with no wallet; "Connect" is the first CTA inside the card; connection state never navigates away.
5. **Success state**: full-screen thank-you in the card, tx hash link, "Share on X" prefilled intent ("I just tipped @nf_suzanne for her essays →"). This is the viral loop; it does not exist today.
6. **Social proof strip**: "141 tips · last one 2h ago" from the D1 table (verified against chain). Even modest numbers outperform silence.
7. **Card path for no-wallet users**: "No wallet? Tip with card" → Privy embedded wallet + card funding, or a plain Stripe Payment Link as MVP. Never show a crypto error to a fiat user; show the card path instead.

---

## 5. "Collect Dust" feature spec (Tab B)

Concept is genuinely strong: "your wallet's couch cushions fund the next essay." It needs to be effortless and gas-aware to work.

**Flow**
1. Connect → server-side balance discovery (Alchemy/Zerion API via CF Worker; never ask users for contract addresses; filter spam tokens by liquidity/price availability).
2. Auto-select tokens worth $0.10–$20 with USD values shown ("dust" definition; thresholds configurable). Show total: "You have $7.42 of dust across 9 tokens."
3. **Gas floor rule**: exclude (grey out, explain) any token whose estimated execution cost exceeds its value on the connected chain. Show net-to-recipient estimate, not gross.
4. Review: itemised list, USD total, est. gas, net amount, recipient (ENS + full address).
5. Execute — two paths by wallet capability:
   - **Batched (preferred):** EIP-5792 `wallet_sendCalls` — one click, one confirmation for all transfers. MetaMask, Rabby, Coinbase Wallet and most 2026 wallets support this via EIP-7702 upgraded EOAs. (This is why the old DustSweeper service deprecated itself.)
   - **Sequential fallback:** individual `transfer()` txs with a progress stepper ("2 of 5 sent") and per-item skip.

**Aggregation/conversion to ETH/USDC — decision required (Q1 below):**
- **Option A — transfer as-is, recipient converts (recommended MVP).** Tokens go straight to Suzanne's wallet; she sweeps them to ETH/USDC herself (Rabby's own UI, Sweepr, or a small admin page using a 0x/LiFi quote). Tipper UX stays one-step and approval-free; zero swap infrastructure on the site; no custody, no swap execution on behalf of users → minimal regulatory surface.
- **Option B — swap client-side, then send.** Quote via 0x/LiFi, user approves (Permit2) and executes swap in their own wallet, output (ETH/USDC) sent to recipient. Cleaner for the recipient, but adds approvals, slippage handling, per-token liquidity failures, and aggregator fee/latency to the tipper's flow — and many true dust tokens have no route at all. Ship as v2 behind the same review screen if A proves insufficient.
- **Never** route funds through a site-controlled contract or wallet that swaps and forwards. That is custody + exchange functionality (money-transmission territory) and a smart-contract audit burden this project doesn't need. (Not legal advice; if Option B evolves toward pooled conversion, get counsel.)

**Copy note:** "No approvals. Nothing has been sent." is excellent trust language — keep it through the redesign (Option A preserves its literal truth).

---

## 6. Workstreams for agent handoff

**WS1 — Wallet infrastructure** (blocks WS2–WS4)
Install Privy + wagmi + viem + @tanstack/react-query; wrap app in providers; wallet modal shows all EIP-6963 injected wallets (test: MetaMask + Rabby installed simultaneously → both listed, correct one connects), WalletConnect QR/deep-link, email login → embedded wallet. Chain switching UI with names, not hex IDs. Env/secrets via Wrangler. *Accept: connect succeeds on desktop Chrome (MM+Rabby), iOS Safari via WalletConnect, and email-only user.*

**WS2 — Simple tip flow**
Tab A per §4: chips, live USD⇄token conversion (price API server-side), ETH/USDC send, success state + share intent, error states (rejected, insufficient, wrong chain). *Accept: $5 USDC tip on Base completes in ≤4 clicks post-connect; every failure mode has copy, not a dead end.*

**WS3 — Fiat path**
MVP: Stripe Payment Link styled as "Tip with card" (verify Suzanne's Stripe account country/eligibility; USDC settlement toggle optional). V2: Privy card-funding → embedded wallet → on-chain tip, so fiat tippers appear in the same on-chain feed. *Accept: user with no wallet extension completes a card tip without seeing a wallet error.*

**WS4 — Collect Dust rebuild**
Per §5, Option A. Discovery endpoint in CF Worker (Alchemy/Zerion, cached 60s, spam-filtered), auto-selection with USD values, gas-floor exclusion, EIP-5792 batch with sequential fallback, progress + partial-failure handling. Keep existing `eth_call` validation as a fallback "add token manually" affordance (collapsed by default). *Accept: wallet with 10 mixed tokens on Base → discovered, priced, swept in one confirmation on a 7702-capable wallet; sequential path works on a legacy wallet.*

**WS5 — Receipts & social proof**
D1 `tips` table (tx_hash, chain, token, amount, usd_at_time, timestamp, kind: simple|dust|card); Worker verifies tx receipts before insert; public aggregate endpoint for the proof strip; no PII. *Accept: proof strip live-updates within one refresh of a confirmed tip; fake tx hashes rejected.*

**WS6 — Design QA & accessibility**
Preserve palette/typography identity. Fix: min 12px text (kill 8–9px), 24px+ touch targets, muted-text contrast on ink, visible focus rings on dark card, keyboard-only full flow, `aria-live` on tx progress, reduced-motion respected, 320px→1440px layouts (watch 651–900px card column). *Accept: axe clean; keyboard-only tip completes; WCAG 2.1 AA on the card.*

---

## 7. Open questions for the owner (blocking)

1. **Dust conversion: Option A (recipient converts — recommended) or B (tipper-side swap)?** Determines WS4 scope.
2. **Stripe account**: does Suzanne have a US-eligible Stripe merchant account (needed for USDC settlement toggle; card path works regardless)?
3. **ENS name**: register `suzannenfts.eth` (or similar) before launch?
4. **Recipient address `0xd2C2…E203`**: confirm ownership and that it's a cold/hardware wallet; it will be public and load-bearing.
5. Which chains beyond Base at launch?

## 8. Risks

- **Spam/scam tokens** in discovery results (offensive names, fake balances) — filter by price-feed presence; never render token names as HTML.
- **Wallet drainer optics**: a page that enumerates balances and asks to sweep many tokens pattern-matches to drainers. Mitigate: approval-free transfers only, explicit per-token list with USD values, recipient shown full + ENS, "no approvals" copy, open-source link.
- **Privy dependency**: SDK outage removes all connect paths; keep a raw EIP-6963 fallback connect behind a feature flag.
- **Dust that isn't worth sweeping**: on mainnet most dust fails the gas floor; set expectations in UI ("switch to Base to sweep more of your dust").

## Sources

- [Privy × wagmi integration](https://docs.privy.io/wallets/connectors/ethereum/integrations/wagmi) · [Privy embedded wallet connector](https://privy.io/blog/embedded-wallet-connector-launch)
- [Stripe crypto/stablecoin use cases](https://stripe.com/use-cases/crypto) · [Stripe stablecoin payments 2026 overview](https://eco.com/support/en/articles/15083174-stripe-stablecoin-payments-2026) · [Meta creator USDC payouts via Stripe](https://decrypt.co/366087/meta-launches-usdc-stablecoin-creator-payouts-on-solana-and-polygon-via-stripe)
- [EIP-6963 spec](https://eips.ethereum.org/EIPS/eip-6963) · [wagmi injected connector](https://wagmi.sh/react/api/connectors/injected)
- [Sweepr (dust → USDC/ETH, gasless on Base)](https://app.sweepr.co/) · [DustSweeper (deprecated post-EIP-7702)](https://www.dustsweeper.xyz/) · [Rabby dust-sweep feature request](https://github.com/RabbyHub/Rabby/issues/3363)
