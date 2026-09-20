import Link from 'next/link';
import type { Project } from '@/lib/types';
import { MediaImage } from '@/components/media/MediaImage';

/** Lab entries grouped by category (in order of first appearance), each group with a heading. */
export function LabGroups({ projects }: { projects: Project[] }) {
  const groups: { category: string; items: Project[] }[] = [];
  for (const p of projects) {
    const g = groups.find((x) => x.category.toLowerCase() === (p.category || 'Other').toLowerCase());
    if (g) g.items.push(p);
    else groups.push({ category: p.category || 'Other', items: [p] });
  }
  return (
    <div className="space-y-14 md:space-y-20">
      {groups.map((g) => (
        <section key={g.category} aria-labelledby={`lab-${g.category.replace(/\W+/g, '-').toLowerCase()}`}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id={`lab-${g.category.replace(/\W+/g, '-').toLowerCase()}`} className="t-label text-muted-foreground">
              {g.category}
            </h2>
            <span className="t-label text-muted-foreground">{String(g.items.length).padStart(2, '0')}</span>
          </div>
          <LabList projects={g.items} hideCategory />
        </section>
      ))}
    </div>
  );
}

/** Text-forward list of lab entries: year · title · tags, with a small still when there is one. */
export function LabList({ projects, hideCategory = false }: { projects: Project[]; hideCategory?: boolean }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {projects.map((p) => {
        const still = p.cover ?? p.media[0];
        return (
          <li key={p.id}>
            <Link href={`/lab/${p.slug}/`} className="group grid cursor-pointer grid-cols-[4rem_1fr] items-start gap-6 py-6 md:grid-cols-[6rem_1fr_minmax(0,18rem)_8rem] md:items-center md:gap-10 md:py-7">
              <span className="t-label pt-1 text-muted-foreground md:pt-0">{p.year}</span>
              <span className="min-w-0">
                <span className="t-h2 block text-foreground/90 transition-colors group-hover:text-foreground">{p.title}</span>
                <span className="t-caption mt-1 block text-muted-foreground md:hidden">{[hideCategory ? null : p.category, ...p.tags].filter(Boolean).join(' · ')}</span>
                {p.description && <span className="t-caption mt-2 line-clamp-2 block max-w-[60ch] text-muted-foreground">{p.description.split(/\n/)[0]}</span>}
              </span>
              <span className="t-caption hidden text-muted-foreground md:block">
                {!hideCategory && p.category}
                {p.tags.length ? <span className="block">{p.tags.join(' · ')}</span> : null}
              </span>
              <span className="relative hidden aspect-[4/3] w-32 overflow-hidden bg-surface md:block">
                {still && <MediaImage media={still} sizes="128px" />}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
