'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { useSite } from '@/components/SiteProvider';

export function Footer({ projectCount }: { projectCount: number }) {
  const site = useSite();
  const [year] = useState(() => new Date().getFullYear());

  return (
    <footer
      className={
        'mt-auto border-t border-border/80 bg-background/95 backdrop-blur ' +
        'supports-[backdrop-filter]:bg-background/80'
      }
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 md:px-12 lg:px-24">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 text-xs tracking-wide text-muted-foreground">
          <div className="flex items-center gap-3 tracking-mono">
            <Logo className="h-4 w-4 text-foreground" />
            <span>© {year}</span>
            <span aria-hidden>·</span>
            <span className="font-display italic text-foreground/80">{site.copyright || site.name}</span>
            <span aria-hidden className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              {projectCount} project{projectCount === 1 ? '' : 's'}
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-4">
            <Link href="/" className="transition hover:text-foreground">
              Index
            </Link>
            {site.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer me" className="transition hover:text-foreground">
                {l.label}
              </a>
            ))}
            {site.email && (
              <a href={`mailto:${site.email}`} className="transition hover:text-foreground">
                Contact
              </a>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
