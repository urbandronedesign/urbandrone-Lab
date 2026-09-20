'use client';

import { useGalleryStore } from '@/lib/store';
import type { Project } from '@/lib/types';
import { motion } from 'framer-motion';
import { MediaImage } from '@/components/media/MediaImage';

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero({ project, index }: { project: Project; index: number }) {
  const openProject = useGalleryStore((s) => s.openProject);

  const cover = project.cover ?? project.media[0];
  if (!cover) return null;

  const label = String(index + 1).padStart(2, '0');

  return (
    <section className="relative w-full">
      <motion.button
        type="button"
        onClick={() => openProject(project.id)}
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease }}
        className="group relative block w-full overflow-hidden"
        aria-label={`Open ${project.title}`}
      >
        <div className="relative aspect-[16/10] w-full md:aspect-[16/9] lg:aspect-[2.35/1]">
          <MediaImage
            media={cover}
            priority
            sizes="100vw"
            className="transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
          />
          {/* subtle bottom gradient for legibility */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
        </div>

        {/* Overlay metadata */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 md:p-12 lg:p-16">
          <div className="flex items-start justify-between text-white">
            <span className="tracking-mono text-[10px] uppercase tracking-[0.25em] opacity-90">
              Featured · {label}
            </span>
            <span className="tracking-mono text-[10px] uppercase tracking-[0.25em] opacity-90">
              {project.category}
            </span>
          </div>

          <div className="flex items-end justify-between gap-6 text-white">
            <div>
              <h2 className="font-display text-4xl font-normal leading-[0.95] tracking-tight md:text-6xl lg:text-7xl text-balance">
                {project.title}
              </h2>
              <p className="mt-3 max-w-xl text-sm text-white/80 md:text-base">
                {project.description.split('\n')[0].slice(0, 140)}
                {project.description.length > 140 ? '…' : ''}
              </p>
            </div>
            <span className="hidden shrink-0 items-center gap-2 text-xs tracking-[0.2em] uppercase opacity-90 transition group-hover:gap-3 md:inline-flex">
              View Project
              <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </motion.button>
    </section>
  );
}
