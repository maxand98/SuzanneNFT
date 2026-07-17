import { archive } from "@/lib/archive";
import { threadImages } from "@/lib/thread-images";
import Image from "next/image";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default function Home() {
  const artistsById = new Map(archive.artists.map((artist) => [artist.id, artist]));

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Suzanne’s Threads, home">
          Suzanne’s Threads
        </a>
        <nav className="header-links" aria-label="Site links">
          <a href="https://x.com/nf_suzanne" target="_blank" rel="noreferrer">
            @nf_suzanne ↗
          </a>
          <a
            className="tip-button"
            href="/tip"
          >
            Tip writer
          </a>
        </nav>
      </header>

      <section className="intro" id="top">
        <div className="intro-copy">
          <p className="kicker">Unofficial archive</p>
          <h1>
            <span>Essays on</span>
            <em>digital art.</em>
          </h1>
          <p>
            A chronological reading list of artist essays by SuzanneNFTs.
          </p>
        </div>
        <div className="profile-group">
          <a className="profile" href="https://x.com/nf_suzanne" target="_blank" rel="noreferrer">
            <Image unoptimized src="/suzanne-pfp.jpg" alt="CryptoPunk #6573, used as SuzanneNFTs’ profile picture" width="400" height="400" priority />
            <span>SuzanneNFTs<br /><small>@nf_suzanne ↗</small></span>
          </a>
          <a className="punk-credit" href="https://www.cryptopunks.app/cryptopunks/details/6573" target="_blank" rel="noreferrer">
            Profile image: CryptoPunk #6573 ↗
          </a>
        </div>
      </section>

      <section className="catalogue" aria-labelledby="essay-heading">
        <div className="catalogue-heading">
          <p className="kicker">Reading index</p>
          <h2 id="essay-heading">Artist essays</h2>
          <p>{archive.threads.length} essays · 2023—2026</p>
        </div>

        <ol className="essay-list">
          {archive.threads.map((thread) => {
            const featuredArtists = thread.artist_ids
              .map((artistId) => artistsById.get(artistId))
              .filter((artist) => artist !== undefined);

            return (
            <li key={thread.id}>
              <article className="essay-row">
                <a className="essay-image" href={thread.x_url} target="_blank" rel="noreferrer" tabIndex={-1}>
                  <Image
                    unoptimized
                    src={threadImages[thread.id]}
                    alt={`Artwork featured in ${thread.title}`}
                    loading="lazy"
                    width="480"
                    height="320"
                  />
                </a>
                <div className="essay-copy">
                  <div className="essay-details">
                    <time dateTime={thread.date}>
                      {dateFormatter.format(new Date(`${thread.date}T00:00:00Z`))}
                    </time>
                    <span>{thread.parts} posts</span>
                  </div>
                  <h3>
                    <a href={thread.x_url} target="_blank" rel="noreferrer">
                      {thread.title}
                    </a>
                  </h3>
                  <p>{thread.summary}</p>
                  <p className="raster-links">
                    <span>Raster:</span>{" "}
                    {featuredArtists.map((artist, index) => (
                      <span key={artist.id}>
                        {index > 0 ? ", " : ""}
                        <a href={artist.raster_url} target="_blank" rel="noreferrer">
                          {artist.name} ↗
                        </a>
                      </span>
                    ))}
                  </p>
                </div>
              </article>
              </li>
            );
          })}
        </ol>
      </section>

      <footer>
        <p className="footer-label">Open archive · CC0</p>
        <div className="footer-copy">
          <p>
            This fan site’s code, design, and archive compilation are dedicated
            to the public domain under{" "}
            <a
              href="https://creativecommons.org/publicdomain/zero/1.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC0 ↗
            </a>
            . Anyone may copy, adapt, or reuse them—including Suzanne.
          </p>
          <p>
            Suzanne’s essays, images, and other original content remain hers
            and are not included in this dedication. If you enjoy her work,
            you can <a href="/tip">tip the writer</a> to support more open research.
          </p>
        </div>
      </footer>
    </main>
  );
}
