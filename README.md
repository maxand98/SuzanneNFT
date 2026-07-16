# Suzanne’s Threads

An unofficial, data-driven archive of digital-art and NFT-artist threads by [@nf_suzanne](https://x.com/nf_suzanne), with direct links to each featured artist’s [Raster](https://www.raster.art/) profile.

## Identity

`public/suzanne-pfp.jpg` is the CryptoPunk profile image shown on Suzanne’s public X profile. It is used unchanged in the header and hero identity card. If Suzanne changes her profile image, replace this file with the new public profile asset and preserve the same filename.

## Add or update content

All archive content lives in `data/archive.json`. Add a thread to the `threads` array and connect it to artists with `artist_ids`. Add each artist once to `artists`, with a full `raster_url` and matching `threads_mentioned` IDs.

Each thread supports a date, summary, excerpt, key highlights, tags, featured artists, original X URL, status, and a references list. The search, filters, artist mention counts and modals update automatically. Mark samples as `placeholder`; use `verified` only after checking the original X thread and Raster profile.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

## Cloudflare deployment plan

1. Create a GitHub repository and push this project’s default branch.
2. In Cloudflare, create a Pages/Workers project connected to the GitHub repository.
3. Select Node.js 22, use `npm run build` as the build command, and deploy the Vinext output in `dist`.
4. Enable preview deployments for pull requests and production deployments from the default branch.
5. Replace the placeholder `metadataBase` in `app/layout.tsx` with the production domain, then redeploy.
6. Add a custom domain in Cloudflare and enable Web Analytics. The site needs no secrets, database or server-side content.
7. For updates, edit `data/archive.json`, verify links locally, commit and push. Cloudflare rebuilds automatically.

The repository can also be published through Codex Sites using `.openai/hosting.json`.
