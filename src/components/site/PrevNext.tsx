import Link from 'next/link';
import type { Project } from '@/lib/types';

/** Previous / next navigation at the bottom of a project page. */
export function PrevNext({ prev, next, base }: { prev: Project | null; next: Project | null; base: string }) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="Project navigation" className="border-t border-border">
      <div className="gutter mx-auto grid w-full max-w-[1600px] grid-cols-2">
        <div className="py-8 md:py-12">
          {prev && (
            <Link href={`${base}${prev.slug}/`} className="group block cursor-pointer">
              <span className="t-label text-muted-foreground">← Previous</span>
              <span className="t-h2 mt-2 block text-foreground/80 transition-colors group-hover:text-foreground">{prev.title}</span>
            </Link>
          )}
        </div>
        <div className="py-8 text-right md:py-12">
          {next && (
            <Link href={`${base}${next.slug}/`} className="group block cursor-pointer">
              <span className="t-label text-muted-foreground">Next →</span>
              <span className="t-h2 mt-2 block text-foreground/80 transition-colors group-hover:text-foreground">{next.title}</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
