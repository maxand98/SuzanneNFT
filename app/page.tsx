import { archive } from "@/lib/archive";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default function Home() {
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
        <p className="kicker">Unofficial archive</p>
        <h1>Tweet essays on digital art.</h1>
        <p>
          A chronological reading list of artist essays by SuzanneNFTs. Every title
          opens the original thread on X.
        </p>
      </section>

      <section aria-labelledby="essay-heading">
        <div className="list-heading">
          <h2 id="essay-heading">Essays</h2>
          <span>{archive.threads.length}</span>
        </div>

        <ol className="essay-list">
          {archive.threads.map((thread) => (
            <li key={thread.id}>
              <a href={thread.x_url} target="_blank" rel="noreferrer">
                <time dateTime={thread.date}>
                  {dateFormatter.format(new Date(`${thread.date}T00:00:00Z`))}
                </time>
                <div className="essay-copy">
                  <h3>{thread.title}</h3>
                  <p>{thread.summary}</p>
                </div>
                <span className="essay-meta">
                  {thread.parts} posts <span aria-hidden="true">↗</span>
                </span>
              </a>
            </li>
          ))}
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
