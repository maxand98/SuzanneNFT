import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Suzanne’s Threads archive", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");

  const html = await response.text();
  assert.match(html, /http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/i);
  assert.match(html, /http-equiv="Pragma" content="no-cache"/i);
  assert.match(html, /<title>Suzanne’s Threads — Essays on Digital Art<\/title>/i);
  assert.match(html, /Essays on/);
  assert.match(html, /digital art/);
  assert.doesNotMatch(html, /Unofficial archive|Reading index/);
  assert.doesNotMatch(html, /Every title opens the original thread on X/);
  assert.match(html, /39(?:<!-- -->)? essays/);
  assert.match(html, /m0dest/);
  assert.match(html, /https:\/\/x\.com\/nf_suzanne\/status\/2076993793212190795/);
  assert.match(html, /Raster:/);
  assert.match(html, /https:\/\/www\.raster\.art\/artist\/m0dest/);
  assert.match(html, /suzanne-pfp\.jpg/);
  assert.match(html, /CryptoPunk #6573, used as SuzanneNFTs’ profile picture/);
  assert.match(html, /https:\/\/www\.cryptopunks\.app\/cryptopunks\/details\/6573/);
  assert.match(html, /href="\/tip"/);
  assert.match(html, /Tip writer/);
  assert.doesNotMatch(html, /Donate ETH/);
  assert.match(html, /rel="icon"[^>]*href="https:\/\/suzannnenfts\.com\/favicon\.png"/i);
  assert.match(html, /rel="shortcut icon"[^>]*href="https:\/\/suzannnenfts\.com\/favicon\.ico"/i);
  assert.match(html, /https:\/\/pbs\.twimg\.com\/media\/HNL22MibsAAq1Ih\.jpg/);
  assert.match(html, /Open archive · CC0/);
  assert.match(html, /creativecommons\.org\/publicdomain\/zero\/1\.0/);
  assert.match(html, /Suzanne’s essays, images, and other original content remain hers/);
  assert.match(html, /to support more open research/);
  assert.equal((html.match(/Artwork featured in/g) ?? []).length, 78);
  const archive = JSON.parse(await readFile(new URL("../data/archive.json", import.meta.url), "utf8"));
  for (const artist of archive.artists) assert.ok(html.includes(artist.raster_url));
  assert.doesNotMatch(html, /Explore Artists|Search threads|Open note/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("server-renders the reader support page", async () => {
  const response = await render("/tip");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const html = await response.text();
  assert.match(html, /<title>Tip the writer · Suzanne’s Threads<\/title>/i);
  assert.match(html, />Tip the writer</);
  assert.doesNotMatch(html, />Tip the writer\.</);
  assert.match(html, /next essay/);
  assert.match(html, /Connect wallet/);
  assert.doesNotMatch(html, /Send a tip\./);
  assert.doesNotMatch(html, /Support Suzanne’s next essay about digital art/);
  assert.doesNotMatch(html, /CryptoPunk profile picture used by SuzanneNFTs/);
  assert.doesNotMatch(html, /suzanne-pfp\.jpg/);
  assert.doesNotMatch(html, /no paywall/i);
  assert.doesNotMatch(html, /Reader-supported writing/);
  assert.doesNotMatch(html, /Use what is already in your wallet/);
  assert.match(html, /Patrons/);
  assert.match(html, /Successful public ETH and USDC transfers/);
  const sweepSource = await readFile(new URL("../app/tip/DustSweep.tsx", import.meta.url), "utf8");
  assert.match(sweepSource, /eip6963:requestProvider/);
  assert.match(sweepSource, /connection request is already open/);
  assert.match(sweepSource, /Connection was declined in MetaMask/);
  assert.match(sweepSource, /eth_sendTransaction/);
  assert.match(sweepSource, /Transfers submitted/);
  assert.match(sweepSource, /basescan\.org/);
  assert.match(sweepSource, /Select a token/);
  assert.match(sweepSource, /Donation amount/);
  assert.match(sweepSource, /Preset tip amount/);
  assert.match(sweepSource, /label: "10¢", value: 0\.1/);
  assert.match(sweepSource, /label: "\$1", value: 1/);
  assert.match(sweepSource, /label: "\$5", value: 5/);
  assert.match(sweepSource, /amountForUsd/);
  assert.match(sweepSource, /\[50, 75, 100\]/);
  assert.match(sweepSource, /Max reserves the estimated network fee/);
  assert.match(sweepSource, /Donate dust/);
  assert.doesNotMatch(sweepSource, /Choose what to give/);
  assert.match(sweepSource, /because everyone needs 1000 true fans/);
  assert.match(sweepSource, /https:\/\/kk\.org\/thetechnium\/1000-true-fans\//);
  assert.equal((sweepSource.match(/https:\/\/kk\.org\/thetechnium\/1000-true-fans\//g) ?? []).length, 1);
  assert.match(sweepSource, /\{account && \([\s\S]*?\)\}\s*<a\s+className="dust-fans-link"/);
  assert.match(sweepSource, /Combine eligible small balances into ETH or USDC/);
  assert.match(sweepSource, /https:\/\/app\.sweepr\.co\//);
  assert.match(sweepSource, /2% protocol fee/);
  assert.match(sweepSource, /\/api\/tokens/);
  assert.doesNotMatch(sweepSource, /Token contract/);
  assert.doesNotMatch(html, /ethereum:/);
  assert.match(html, /tip-social\.png/);
  assert.doesNotMatch(html, /Donate ETH/);
  assert.doesNotMatch(html, /Address attribution is based on public on-chain activity/);
  const patronSource = await readFile(new URL("../app/tip/PatronList.tsx", import.meta.url), "utf8");
  const patronRoute = await readFile(new URL("../app/api/patrons/route.ts", import.meta.url), "utf8");
  assert.match(patronSource, /\/api\/patrons/);
  assert.match(patronSource, /No personal identity is inferred/);
  assert.match(patronRoute, /launchTimestamp = 1_784_246_400/);
  assert.match(patronRoute, /action=txlist/);
  assert.match(patronRoute, /action=tokentx/);
  assert.match(patronRoute, /contractaddress=\$\{network\.usdc\}/);
});

test("archive data keeps threads, artists and references connected", async () => {
  const archive = JSON.parse(await readFile(new URL("../data/archive.json", import.meta.url), "utf8"));
  const threadIds = new Set(archive.threads.map((thread) => thread.id));
  const artistIds = new Set(archive.artists.map((artist) => artist.id));

  assert.equal(archive.threads.length, 39);
  assert.equal(archive.artists.length, 36);
  for (const thread of archive.threads) {
    assert.ok(thread.x_url.startsWith("https://x.com/"));
    assert.ok(thread.references.length >= 2);
    for (const artistId of thread.artist_ids) assert.ok(artistIds.has(artistId));
  }
  for (const artist of archive.artists) {
    assert.ok(artist.raster_url.startsWith("https://www.raster.art/"));
    for (const threadId of artist.threads_mentioned) assert.ok(threadIds.has(threadId));
  }
});

test("tip page keeps a compact aligned layout", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const sweep = await readFile(new URL("../app/tip/DustSweep.tsx", import.meta.url), "utf8");
  assert.match(css, /\.support-shell \{[\s\S]*?620px/);
  assert.match(css, /\.dust-connect button \{[\s\S]*?width: 100%/);
  assert.match(css, /\.dust-donate-option > p \{[^}]*margin: 9px 0 0;[^}]*text-align: left;/);
  assert.match(css, /\.dust-fans-link \{[^}]*margin: 18px 0 0;/);
  assert.doesNotMatch(css, /\.dust-donate-option > p \{[^}]*text-align: center;/);
  assert.match(sweep, /No approvals\. Nothing has been sent/);
});

test("token discovery rejects unsupported requests", async () => {
  const response = await render("/api/tokens");
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /not supported/i);
});

test("token discovery includes native ETH and canonical USDC", async () => {
  const routeSource = await readFile(new URL("../app/api/tokens/route.ts", import.meta.url), "utf8");
  assert.match(routeSource, /symbol: "ETH"/);
  assert.match(routeSource, /symbol: "USDC"/);
  assert.match(routeSource, /coin_balance/);
  assert.match(routeSource, /0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48/i);
});

test("home hero copy shares one left axis", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--page-gutter: clamp\(22px, 4\.5vw, 76px\)/);
  assert.match(css, /--page-width: 1580px/);
  assert.match(css, /\.site-header,\s*\.intro,\s*\.catalogue,\s*footer \{[\s\S]*?var\(--page-gutter\)[\s\S]*?var\(--page-width\)/);
  assert.match(css, /\.catalogue-heading \{[\s\S]*?width: 100%;[\s\S]*?margin: 0;/);
  assert.match(css, /\.essay-list \{[^}]*width: 100%;[^}]*max-width: none;[^}]*margin: 0;/);
  assert.doesNotMatch(css, /\.catalogue-heading \{[^}]*1320px/);
  assert.doesNotMatch(css, /\.essay-list \{[^}]*1320px/);
  assert.match(css, /\.intro h1 span \{[\s\S]*?display: block/);
  assert.doesNotMatch(css, /\.essay-list li:nth-child/);
  assert.match(css, /@supports \(animation-timeline: view\(\)\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
