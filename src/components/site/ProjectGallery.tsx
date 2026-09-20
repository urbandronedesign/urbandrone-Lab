'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import type { Project } from '@/lib/types';
import { MediaImage, MediaKindBadge } from '@/components/media/MediaImage';
import { Lightbox } from './Lightbox';

const MOSAIC_SIZES = '(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw';

/**
 * A project's media: the hero (cover) shown uncropped on a neutral surface,
 * then the remaining works as a tight mosaic. Everything opens the lightbox.
 */
export function ProjectGallery({ project, children }: { project: Project; children?: React.ReactNode }) {
  const media = project.media;
  const coverIdx = Math.max(0, media.findIndex((m) => m.id === project.cover?.id));
  const hero = media[coverIdx];
  const rest = media.filter((_, i) => i !== coverIdx);
  const [open, setOpen] = useState<number | null>(null);

  if (!hero) return null;

  return (
    <>
      {/* Hero */}
      <section className="bg-surface">
        <button
          type="button"
          onClick={() => setOpen(coverIdx)}
          aria-label={`Open ${hero.title || project.title} full screen`}
          className="group relative mx-auto block w-full max-w-[1920px] cursor-zoom-in"
          style={{ height: 'clamp(56vh, 70vh, 82vh)' }}
        >
          <MediaImage media={hero} sizes="100vw" fit="contain" priority className="p-0 md:p-6" />
          <MediaKindBadge media={hero} className="bottom-4 left-4 md:bottom-8 md:left-8" />
          <span className="t-label pointer-events-none absolute bottom-4 right-4 flex items-center gap-2 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 md:bottom-8 md:right-8">
            <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Full screen
          </span>
        </button>
      </section>

      {/* Title, description, facts */}
      {children}

      {/* Mosaic */}
      {rest.length > 0 && (
        <section className="gutter mx-auto w-full max-w-[1600px] pb-16 md:pb-24">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="t-section">Works</h2>
            <span className="t-label text-muted-foreground">{String(media.length).padStart(2, '0')}</span>
          </div>
          <ul className="grid grid-cols-2 gap-1 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((m) => {
              const i = media.findIndex((x) => x.id === m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(i)}
                    aria-label={`Open ${m.title || 'work'} ${i + 1} full screen`}
                    className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden bg-surface"
                  >
                    <MediaImage media={m} sizes={MOSAIC_SIZES} className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02] motion-reduce:transform-none" />
                    <MediaKindBadge media={m} />
                  </button>
                  {m.title && <p className="t-caption mt-2 truncate text-muted-foreground">{m.title}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <AnimatePresence>
        {open !== null && <Lightbox items={media} index={open} onChange={setOpen} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </>
  );
}
