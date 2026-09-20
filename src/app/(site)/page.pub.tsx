import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getPublishedProjects, pickFeatured } from '@/lib/content';
import { getSite } from '@/lib/site';
import { ArtworkGrid } from '@/components/site/ArtworkGrid';
import { LabList } from '@/components/site/LabList';
import { Prose } from '@/components/site/Prose';

// Rendered once at build time for the static export.
export default async function HomePage() {
  const [site, artworks, lab, collabs] = await Promise.all([getSite(), getPublishedProjects('artworks'), getPublishedProjects('lab'), getPublishedProjects('collabs')]);
  // Featured picks may come from artworks or collabs; falls back to the first artworks
  const featured = pickFeatured([...artworks, ...collabs]);

  return (
    <>
      {/* Hero */}
      <section className="gutter mx-auto flex w-full max-w-[1600px] flex-col justify-end pt-14 pb-14 md:min-h-[42vh] md:pt-20 md:pb-20">
        <p className="t-label mb-6 text-muted-foreground">{site.tagline}</p>
        <h1 className="t-display max-w-[14ch]">{site.name}</h1>
        {site.description && <p className="t-lead mt-8 max-w-[44rem] text-muted-foreground">{site.description}</p>}
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
          <Link href="/artworks/" className="t-label inline-flex cursor-pointer items-center gap-2 py-2 transition-colors hover:text-muted-foreground">
            Artworks <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
          <Link href="/lab/" className="t-label inline-flex cursor-pointer items-center gap-2 py-2 text-muted-foreground transition-colors hover:text-foreground">
            Lab <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* Selected works */}
      {featured.length > 0 && (
        <section className="gutter mx-auto w-full max-w-[1600px] pb-16 md:pb-24" aria-labelledby="selected">
          <div className="mb-6 flex items-baseline justify-between border-t border-border pt-6">
            <h2 id="selected" className="t-label text-muted-foreground">Selected works</h2>
            <Link href="/artworks/" className="t-label cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
              All artworks · {artworks.length}
            </Link>
          </div>
          <ArtworkGrid projects={featured} columns={4} />
        </section>
      )}

      {/* Collabs */}
      {collabs.length > 0 && (
        <section className="gutter mx-auto w-full max-w-[1600px] pb-16 md:pb-24" aria-labelledby="collabs">
          <div className="mb-6 flex items-baseline justify-between border-t border-border pt-6">
            <h2 id="collabs" className="t-label text-muted-foreground">Collabs</h2>
            <Link href="/collabs/" className="t-label cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
              All collabs · {collabs.length}
            </Link>
          </div>
          <ArtworkGrid projects={collabs.slice(0, 5)} base="/collabs/" />
        </section>
      )}

      {/* Lab */}
      {lab.length > 0 && (
        <section className="gutter mx-auto w-full max-w-[1600px] pb-16 md:pb-24" aria-labelledby="lab">
          <div className="mb-2 flex items-baseline justify-between pt-6">
            <h2 id="lab" className="t-label text-muted-foreground">Lab</h2>
            <Link href="/lab/" className="t-label cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
              All entries · {lab.length}
            </Link>
          </div>
          <LabList projects={lab.slice(0, 4)} />
        </section>
      )}

      {/* About */}
      {(site.about || site.email || site.links.length > 0) && (
        <section id="about" className="gutter mx-auto grid w-full max-w-[1600px] gap-10 border-t border-border py-16 md:grid-cols-12 md:py-24" aria-labelledby="about-title">
          <h2 id="about-title" className="t-label text-muted-foreground md:col-span-3">About</h2>
          <div className="md:col-span-7">
            {site.about ? <Prose text={site.about} className="t-lead max-w-[60ch]" /> : <p className="t-lead text-muted-foreground">{site.description}</p>}
            <Link href="/bio/" className="t-label mt-8 inline-flex cursor-pointer items-center gap-2 py-2 transition-colors hover:text-muted-foreground">
              Full biography <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
            {(site.email || site.links.length > 0) && (
              <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
                {site.email && (
                  <li>
                    <a href={`mailto:${site.email}`} className="t-label cursor-pointer underline decoration-border underline-offset-[6px] transition-colors hover:decoration-foreground">
                      {site.email}
                    </a>
                  </li>
                )}
                {site.links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer me" className="t-label cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
                      {l.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </>
  );
}
