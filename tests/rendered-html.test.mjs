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

  const html = await response.text();
  assert.match(html, /<title>Suzanne’s Threads — Essays on Digital Art<\/title>/i);
  assert.match(html, /Essays on/);
  assert.match(html, /digital art/);
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
  assert.match(html, /suzanne-pfp\.jpg[^>]*rel="(?:shortcut )?icon"|rel="(?:shortcut )?icon"[^>]*suzanne-pfp\.jpg/i);
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
  const html = await response.text();
  assert.match(html, /<title>Tip the writer · Suzanne’s Threads<\/title>/i);
  assert.match(html, /Tip the writer/);
  assert.match(html, /next essay/);
  assert.match(html, /Send a tip/);
  assert.match(html, /Connect wallet/);
  assert.doesNotMatch(html, /Reader-supported writing/);
  assert.doesNotMatch(html, /Use what is already in your wallet/);
  const sweepSource = await readFile(new URL("../app/tip/DustSweep.tsx", import.meta.url), "utf8");
  assert.match(sweepSource, /Token contract/);
  assert.match(sweepSource, /Review tip/);
  assert.doesNotMatch(html, /ethereum:/);
  assert.match(html, /tip-social\.png/);
  assert.doesNotMatch(html, /Donate ETH/);
  assert.doesNotMatch(html, /Address attribution is based on public on-chain activity/);
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
  assert.match(css, /\.support-shell \{[\s\S]*?1180px/);
  assert.match(css, /\.dust-connect button \{[\s\S]*?width: 100%/);
  assert.match(sweep, /No approvals\. Nothing has been sent/);
  assert.doesNotMatch(sweep, /eth_sendTransaction/);
});
