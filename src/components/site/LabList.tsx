import Link from 'next/link';
import type { Project } from '@/lib/types';
import { MediaImage } from '@/components/media/MediaImage';

/** Text-forward list of lab entries: year · title · tags, with a small still when there is one. */
export function LabList({ projects }: { projects: Project[] }) {
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
                <span className="t-caption mt-1 block text-muted-foreground md:hidden">{p.category}{p.tags.length ? ` · ${p.tags.join(' · ')}` : ''}</span>
                {p.description && <span className="t-caption mt-2 line-clamp-2 block max-w-[60ch] text-muted-foreground">{p.description.split(/\n/)[0]}</span>}
              </span>
              <span className="t-caption hidden text-muted-foreground md:block">
                {p.category}
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
