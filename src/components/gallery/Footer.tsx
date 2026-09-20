'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { useState } from 'react';

export function Footer({ projectCount }: { projectCount: number }) {
  const [year] = useState(() => new Date().getFullYear());

  return (
    <footer
      className={
        'mt-auto border-t border-border/80 bg-background/95 backdrop-blur ' +
        'supports-[backdrop-filter]:bg-background/80'
      }
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 md:px-12 lg:px-24">
        <div className="flex h-14 items-center justify-between gap-4 text-xs tracking-wide text-muted-foreground">
          <div className="flex items-center gap-3 tracking-mono">
            <Logo className="h-4 w-4 text-foreground" />
            <span>© {year}</span>
            <span aria-hidden>·</span>
            <span className="font-display italic text-foreground/80">Atelier</span>
            <span aria-hidden className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              {projectCount} project{projectCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="transition hover:text-foreground">
              Index
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
