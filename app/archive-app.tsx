"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ExternalLink,
  Mail,
  Menu,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { archive, type Thread } from "@/lib/archive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const allTags = Array.from(new Set(archive.threads.flatMap((thread) => thread.tags))).sort();

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${date}T00:00:00`));
}

function ExternalAnchor({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noreferrer">{children}</a>;
}

export function ArchiveApp() {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("All");
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const normalized = query.trim().toLowerCase();
  const filteredThreads = useMemo(() => archive.threads.filter((thread) => {
    const artists = thread.artist_ids.map((id) => archive.artists.find((artist) => artist.id === id)?.name ?? "").join(" ");
    const matchesQuery = !normalized || [thread.title, thread.summary, thread.excerpt, ...thread.tags, artists].join(" ").toLowerCase().includes(normalized);
    return matchesQuery && (tag === "All" || thread.tags.includes(tag));
  }), [normalized, tag]);

  const filteredArtists = useMemo(() => archive.artists.filter((artist) => {
    if (!normalized) return true;
    return [artist.name, artist.context, artist.x_handle ?? "", ...artist.tags].join(" ").toLowerCase().includes(normalized);
  }), [normalized]);

  useEffect(() => {
    if (!activeThread) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setActiveThread(null);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [activeThread]);

  return (
    <main id="top">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Suzanne’s Threads home">
          <span className="wordmark-mark">ST</span><span>Suzanne’s Threads</span>
        </a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><Menu size={19} /></button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"} aria-label="Primary navigation">
          <a href="#threads" onClick={() => setMenuOpen(false)}>Threads</a>
          <a href="#artists" onClick={() => setMenuOpen(false)}>Artists</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <ExternalAnchor href="https://x.com/nf_suzanne">@nf_suzanne <ExternalLink size={12} /></ExternalAnchor>
        </nav>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-scrim" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow"><Sparkles size={13} /> Unofficial digital art archive · 2026</p>
          <h1 id="hero-title">The threads<br /><em>worth keeping.</em></h1>
          <p className="hero-copy">Preserving the insightful threads on digital art &amp; NFT artists by <ExternalAnchor href="https://x.com/nf_suzanne">@nf_suzanne</ExternalAnchor>—with every artist connected to their Raster oeuvre.</p>
          <div className="hero-actions">
            <a className="button primary" href="#threads">Browse threads <ArrowRight size={16} /></a>
            <a className="button ghost" href="#artists">Explore artists</a>
          </div>
        </div>
        <div className="hero-index" aria-label={`${archive.threads.length} threads and ${archive.artists.length} artists indexed`}>
          <div><strong>{String(archive.threads.length).padStart(2, "0")}</strong><span>Threads</span></div>
          <div><strong>{String(archive.artists.length).padStart(2, "0")}</strong><span>Artists</span></div>
          <div><strong>01</strong><span>Verified</span></div>
        </div>
      </section>

      <section className="search-dock" aria-label="Archive search">
        <Search size={18} aria-hidden="true" />
        <label className="sr-only" htmlFor="archive-search">Search threads and artists</label>
        <input id="archive-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search threads, artists, themes…" />
        {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
        <span className="search-count">{filteredThreads.length + filteredArtists.length} results</span>
      </section>

      <section className="archive-section" id="threads">
        <div className="section-heading">
          <div><p className="eyebrow">01 · The archive</p><h2>Selected threads</h2></div>
          <p>Editorial notes point back to the source. Placeholder entries are labelled until their X threads are verified.</p>
        </div>
        <div className="tag-filter" aria-label="Filter threads by theme">
          {["All", ...allTags].map((item) => <Button key={item} className={tag === item ? "active" : ""} onClick={() => setTag(item)}>{item}</Button>)}
        </div>
        <motion.div className="thread-grid" layout>
          <AnimatePresence mode="popLayout">
            {filteredThreads.map((thread, index) => (
              <motion.article
                className="thread-card"
                key={thread.id}
                layout
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: index * 0.035 }}
              >
                <button className="card-hit" onClick={() => setActiveThread(thread)} aria-label={`Open archive note: ${thread.title}`} />
                <div className="card-meta"><span>{formatDate(thread.date)}</span><span className={`status ${thread.status}`}>{thread.status === "verified" ? <Check size={11} /> : null}{thread.status}</span></div>
                <h3>{thread.title}</h3>
                <p>{thread.summary}</p>
                <div className="card-tags">{thread.tags.map((item) => <Badge key={item}>{item}</Badge>)}</div>
                <div className="card-footer"><span>{thread.artist_ids.length} featured artist{thread.artist_ids.length === 1 ? "" : "s"}</span><span>Open note <ArrowRight size={15} /></span></div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
        {filteredThreads.length === 0 && <div className="empty-state"><BookOpen size={24} /><p>No threads match that search yet.</p><button onClick={() => { setQuery(""); setTag("All"); }}>Reset archive</button></div>}
      </section>

      <section className="artist-section" id="artists">
        <div className="section-heading">
          <div><p className="eyebrow">02 · Artist register</p><h2>Artists, connected.</h2></div>
          <p>Each dossier connects the archive context to Raster’s cross-platform view of the artist’s work.</p>
        </div>
        <div className="artist-grid">
          {filteredArtists.map((artist, index) => (
            <motion.article className="artist-card" key={artist.id} initial={reducedMotion ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div className="artist-number">{String(index + 1).padStart(2, "0")}</div>
              <div className="artist-main">
                <h3>{artist.name}</h3>
                <p>{artist.context}</p>
                <div className="card-tags">{artist.tags.map((item) => <Badge key={item}>{item}</Badge>)}</div>
              </div>
              <div className="artist-links">
                <ExternalAnchor href={artist.raster_url} className="button primary">View on Raster <ExternalLink size={14} /></ExternalAnchor>
                {artist.x_handle && <ExternalAnchor href={`https://x.com/${artist.x_handle}`}>@{artist.x_handle} ↗</ExternalAnchor>}
                <span>{artist.threads_mentioned.length} thread mention</span>
              </div>
            </motion.article>
          ))}
        </div>
        {filteredArtists.length === 0 && <div className="empty-state"><p>No artists match that search yet.</p></div>}
      </section>

      <section className="about-section" id="about">
        <div><p className="eyebrow">03 · About</p><h2>An index built<br />for following ideas.</h2></div>
        <div className="about-copy">
          <p>Suzanne’s Threads is a fan-made research index for readers who value @nf_suzanne’s careful tours through digital artists and their work. It preserves the route—not the ownership—of every thread.</p>
          <p className="disclaimer">Unofficial fan site. All original threads belong to @nf_suzanne. Artist works remain the property of their respective creators. Archive notes link to original X posts and Raster profiles.</p>
          <a className="button primary" href="mailto:hello@example.com?subject=Suggest%20a%20SuzanneNFTs%20thread"><Mail size={15} /> Suggest a thread</a>
        </div>
      </section>

      <footer>
        <div className="wordmark"><span className="wordmark-mark">ST</span><span>Suzanne’s Threads</span></div>
        <p>An unofficial archive of digital art writing.</p>
        <div className="footer-links"><ExternalAnchor href="https://x.com/nf_suzanne">Suzanne on X ↗</ExternalAnchor><ExternalAnchor href="https://www.raster.art/">Raster ↗</ExternalAnchor><a href="#top">Back to top <ArrowUp size={13} /></a></div>
        <small>© 2026 Suzanne’s Threads · Fan archive · No affiliation with X or Raster.</small>
      </footer>

      <AnimatePresence>
        {activeThread && (
          <motion.div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setActiveThread(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" initial={reducedMotion ? false : { opacity: 0, y: 24, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .99 }}>
              <button className="modal-close" onClick={() => setActiveThread(null)} aria-label="Close archive note"><X /></button>
              <div className="modal-top"><p className="eyebrow">Archive note · {formatDate(activeThread.date)}</p><h2 id="modal-title">{activeThread.title}</h2><div className="card-tags">{activeThread.tags.map((item) => <Badge key={item}>{item}</Badge>)}</div></div>
              <div className="modal-grid">
                <div>
                  <h3>Summary</h3><p>{activeThread.excerpt}</p>
                  <h3>Key notes</h3><ol>{activeThread.highlights.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol>
                </div>
                <aside>
                  <h3>Featured artists</h3>
                  {activeThread.artist_ids.map((id) => {
                    const artist = archive.artists.find((item) => item.id === id);
                    return artist ? <div className="modal-artist" key={artist.id}><strong>{artist.name}</strong><span>{artist.context}</span><ExternalAnchor className="button primary" href={artist.raster_url}>Raster profile <ExternalLink size={13} /></ExternalAnchor></div> : null;
                  })}
                  <h3>References</h3>
                  <ul className="reference-list">{activeThread.references.map((reference) => <li key={reference.url}><ExternalAnchor href={reference.url}>{reference.label} <ExternalLink size={12} /></ExternalAnchor></li>)}</ul>
                </aside>
              </div>
              <ExternalAnchor href={activeThread.x_url} className="modal-x-link">Read the full thread on X <ArrowRight size={16} /></ExternalAnchor>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
