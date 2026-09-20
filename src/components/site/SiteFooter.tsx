'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { useSite } from '@/components/SiteProvider';
import { resetAnalyticsConsent } from './Analytics';

export function SiteFooter() {
  const site = useSite();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-border">
      <div className="gutter mx-auto grid w-full max-w-[1600px] gap-8 py-10 md:grid-cols-12 md:py-14">
        <div className="flex items-start gap-4 md:col-span-5">
          <Logo className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <p className="text-sm font-medium">{site.name}</p>
            {site.tagline && <p className="t-caption mt-1 text-muted-foreground">{site.tagline}</p>}
          </div>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-3 md:col-span-4">
          <Link href="/artworks/" className="t-caption cursor-pointer text-muted-foreground transition-colors hover:text-foreground">Artworks</Link>
          <Link href="/lab/" className="t-caption cursor-pointer text-muted-foreground transition-colors hover:text-foreground">Lab</Link>
          <Link href="/bio/" className="t-caption cursor-pointer text-muted-foreground transition-colors hover:text-foreground">Bio</Link>
          {site.email && (
            <a href={`mailto:${site.email}`} className="t-caption cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
              Contact
            </a>
          )}
        </nav>

        {site.links.length > 0 && (
          <nav aria-label="Elsewhere" className="grid grid-cols-2 gap-x-8 gap-y-3 md:col-span-3">
            {site.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer me" className="t-caption cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </nav>
        )}

        <p className="t-label flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground md:col-span-12">
          <span>© {year} {site.copyright || site.name}</span>
          {site.gaMeasurementId && (
            <button type="button" onClick={resetAnalyticsConsent} className="cursor-pointer transition-colors hover:text-foreground">
              Cookie settings
            </button>
          )}
        </p>
      </div>
    </footer>
  );
}
