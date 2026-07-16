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
        <a href="https://x.com/nf_suzanne" target="_blank" rel="noreferrer">
          @nf_suzanne ↗
        </a>
      </header>

      <section className="intro" id="top">
        <div className="intro-copy">
          <p className="kicker">Unofficial archive</p>
          <h1>Tweet essays on digital art.</h1>
          <p>
            A chronological reading list of artist essays by SuzanneNFTs. Every title
            opens the original thread on X.
          </p>
        </div>
        <a className="profile" href="https://x.com/nf_suzanne" target="_blank" rel="noreferrer">
          <Image unoptimized src="/suzanne-pfp.jpg" alt="SuzanneNFTs CryptoPunk profile picture" width="400" height="400" priority />
          <span>SuzanneNFTs<br /><small>@nf_suzanne ↗</small></span>
        </a>
      </section>

      <section aria-labelledby="essay-heading">
        <div className="list-heading">
          <h2 id="essay-heading">Essays</h2>
          <span>{archive.threads.length}</span>
        </div>

        <ol className="essay-list">
          {archive.threads.map((thread) => {
            const featuredArtists = thread.artist_ids
              .map((artistId) => artistsById.get(artistId))
              .filter((artist) => artist !== undefined);

            return (
            <li key={thread.id}>
              <article className="essay-row">
                <time dateTime={thread.date}>
                  {dateFormatter.format(new Date(`${thread.date}T00:00:00Z`))}
                </time>
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
                <a
                  className="essay-meta"
                  href={thread.x_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Read ${thread.title} on X`}
                >
                  {thread.parts} posts <span aria-hidden="true">↗</span>
                </a>
              </article>
              </li>
            );
          })}
        </ol>
      </section>

      <footer>
        <p>
          Unofficial fan index. All essays belong to{" "}
          <a href="https://x.com/nf_suzanne" target="_blank" rel="noreferrer">
            @nf_suzanne
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
