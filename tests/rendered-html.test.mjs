import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Suzanne’s Threads archive", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Suzanne’s Threads — Digital Art Thread Archive<\/title>/i);
  assert.match(html, /The threads/);
  assert.match(html, /worth keeping/);
  assert.match(html, /m0dest/);
  assert.match(html, /suzanne-pfp\.jpg/);
  assert.match(html, /SuzanneNFTs CryptoPunk/);
  assert.match(html, /https:\/\/www\.raster\.art\/artist\/m0dest/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("archive data keeps threads, artists and references connected", async () => {
  const archive = JSON.parse(await readFile(new URL("../data/archive.json", import.meta.url), "utf8"));
  const threadIds = new Set(archive.threads.map((thread) => thread.id));
  const artistIds = new Set(archive.artists.map((artist) => artist.id));

  assert.equal(archive.threads.length, 19);
  assert.equal(archive.artists.length, 18);
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
