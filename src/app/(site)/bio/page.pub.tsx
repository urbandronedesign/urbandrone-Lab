import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { getBio, groupCv } from '@/lib/bio';
import { getSite } from '@/lib/site';
import { BioText } from '@/components/site/BioText';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbJsonLd, graph, pageMeta, personJsonLd } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const [site, bio] = await Promise.all([getSite(), getBio()]);
  return pageMeta(site, '/bio/', { title: 'Bio', type: 'profile', description: bio.headline || site.tagline, image: bio.portrait?.url });
}

export default async function BioPage() {
  const [bio, site] = await Promise.all([getBio(), getSite()]);
  const groups = groupCv(bio.cv);
  const headline = bio.headline || site.tagline || site.name;

  return (
    <>
      <JsonLd data={graph({ '@type': 'ProfilePage', mainEntity: personJsonLd(site, bio) }, breadcrumbJsonLd(site, [{ name: site.name, path: '/' }, { name: 'Bio', path: '/bio/' }]))} />
      {/* Portrait + text */}
      <section className="gutter mx-auto grid w-full max-w-[1600px] gap-10 pt-12 pb-16 md:grid-cols-12 md:pt-20 md:pb-24">
        {bio.portrait && (
          <div className="md:col-span-4 xl:col-span-3">
            <figure className="relative aspect-[4/5] overflow-hidden bg-surface">
              <img
                src={bio.portrait.url}
                alt={bio.portrait.alt || site.author || site.name}
                width={bio.portrait.width ?? undefined}
                height={bio.portrait.height ?? undefined}
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </figure>
          </div>
        )}

        <div className={bio.portrait ? 'md:col-span-7 md:col-start-6 xl:col-span-6 xl:col-start-5' : 'md:col-span-8 xl:col-span-7'}>
          <BioText
            en={{ headline, text: bio.text }}
            fr={bio.textFr ? { headline: bio.headlineFr || headline, text: bio.textFr } : null}
            fallback={site.description}
          />
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

      {/* CV */}
      {groups.length > 0 && (
        <section className="gutter mx-auto w-full max-w-[1600px] border-t border-border pb-16 md:pb-24" aria-label="Curriculum vitae">
          {groups.map(({ group, entries }) => (
            <div key={group} className="grid gap-4 border-b border-border py-8 md:grid-cols-12 md:gap-10 md:py-10">
              <h2 className="t-section md:col-span-3">{group}</h2>
              <ul className="md:col-span-9 xl:col-span-7">
                {entries.map((e, i) => (
                  <li key={i} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-4 py-2 md:grid-cols-[6rem_minmax(0,1fr)]">
                    <span className="t-label pt-1 text-muted-foreground">{e.year}</span>
                    <span className="t-caption md:text-[0.9375rem]">
                      {e.url ? (
                        e.url.startsWith('/') ? (
                          <Link href={e.url} className="cursor-pointer underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground">
                            {e.text}
                          </Link>
                        ) : (
                          <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex cursor-pointer items-baseline gap-1.5 underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground">
                            {e.text} <ExternalLink className="h-3 w-3 shrink-0 self-center" strokeWidth={1.5} />
                          </a>
                        )
                      ) : (
                        e.text
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
