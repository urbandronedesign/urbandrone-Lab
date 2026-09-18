'use client';

import { useGalleryStore } from '@/lib/store';
import { Asterisk } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Footer({ projectCount }: { projectCount: number }) {
  const setView = useGalleryStore((s) => s.setView);
  const view = useGalleryStore((s) => s.view);
  const [year] = useState(() => new Date().getFullYear());

  useEffect(() => {
    // noop — placeholder so React doesn't complain
  }, []);

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
            <span>© {year}</span>
            <span aria-hidden>·</span>
            <span className="font-display italic text-foreground/80">Atelier</span>
            <span aria-hidden className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              {projectCount} project{projectCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setView('gallery')}
              className={
                'transition hover:text-foreground ' +
                (view === 'gallery' ? 'text-foreground' : '')
              }
            >
              Index
            </button>
            <button
              type="button"
              onClick={() => setView('admin')}
              className={
                'inline-flex items-center gap-1.5 transition hover:text-foreground ' +
                (view === 'admin' ? 'text-foreground' : '')
              }
              aria-label="Enter admin"
              title="Admin"
            >
              <Asterisk className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
