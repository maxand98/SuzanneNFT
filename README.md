# Suzanne’s Threads

An open-source archive and non-custodial Web3 tipping page for independent writers. The live project archives essays by [@nf_suzanne](https://x.com/nf_suzanne) and lets readers send ETH, USDC, or supported ERC-20 tokens directly from their wallet.

## What the tipping page includes

- Direct wallet-to-wallet transfers; the site never holds funds or private keys
- MetaMask discovery through EIP-6963, with ETH, USDC, and ERC-20 balance discovery
- Token picker with estimated USD values and quick $0.10, $1, $5, 50%, 75%, and max controls
- A review step before the wallet asks the reader to approve a transaction
- A public on-chain patron ledger for successful ETH and canonical USDC transfers
- A transaction celebration with reduced-motion support and a prefilled X share composer
- An optional route to an external non-custodial dust-conversion service

## Make it yours

Fork the repository, then edit [`lib/site-config.ts`](lib/site-config.ts):

```ts
export const TIP_RECIPIENT = "0xYourEthereumAddress";
export const PATRON_LEDGER_START = 1_784_246_400; // Unix timestamp
export const WRITER_X_HANDLE = "your_handle";
export const TIP_PAGE_URL = "https://your-domain.example/tip";
```

Replace the archive data in [`data/archive.json`](data/archive.json), update page metadata and branding, and remove or replace Suzanne-specific images in `public/`. Never put a seed phrase, private key, or secret API credential in this repository.

## Local development

Node.js 22.13 or newer is required.

```bash
npm install
npm run dev
```

Run the production build and regression tests with:

```bash
npm test
```

## Deploy

The production build targets Cloudflare Workers through Vinext:

```bash
npm run build
cd dist/server
../../node_modules/.bin/wrangler deploy --config wrangler.json
```

Before deployment, verify the recipient address in `lib/site-config.ts` on the intended block explorer and send a small test transaction. The public patron ledger uses Blockscout-compatible public APIs and currently covers Ethereum, Base, Optimism, and Arbitrum.

## Privacy and safety

Wallet addresses and qualifying donations are public blockchain data. The patron list displays addresses only and does not infer personal identities. Token prices are estimates, transaction fees vary, and users approve every transfer in their own wallet.

## License

The source code, site design, and archive compilation are dedicated to the public domain under [CC0 1.0 Universal](LICENSE). You may copy, modify, publish, and use them commercially without asking permission.

Suzanne’s essays, images, social posts, CryptoPunk profile image, third-party artwork, names, trademarks, and other original or third-party content are not relicensed by this repository. Replace those assets and obtain any permissions needed for your own deployment.
