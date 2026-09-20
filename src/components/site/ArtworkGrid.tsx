'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { Project } from '@/lib/types';
import { MediaImage, MediaKindBadge } from '@/components/media/MediaImage';

export const GRID_SIZES = '(min-width: 1920px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw';

function ArtworkCard({ project, index, base }: { project: Project; index: number; base: string }) {
  const reduce = useReducedMotion();
  const cover = project.cover ?? project.media[0];
  if (!cover) return null;
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : Math.min((index % 10) * 0.03, 0.3) }}
    >
      <Link href={`${base}${project.slug}/`} className="group block cursor-pointer" aria-label={`${project.title}, ${project.year}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-surface md:aspect-square">
          <MediaImage
            media={cover}
            sizes={GRID_SIZES}
            className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02] motion-reduce:transform-none"
          />
          <MediaKindBadge media={cover} />
        </div>
        <div className="flex items-baseline gap-3 pt-2.5 pb-1 pr-4">
          <span className="t-caption truncate">{project.title}</span>
          <span className="t-label shrink-0 text-muted-foreground">{project.year}</span>
        </div>
      </Link>
    </motion.li>
  );
}

/** Tight mosaic of artwork covers, 2 → 3 → 4 → 5 columns. */
export function ArtworkGrid({ projects, base = '/artworks/' }: { projects: Project[]; base?: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-1 gap-y-6 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {projects.map((p, i) => (
        <ArtworkCard key={p.id} project={p} index={i} base={base} />
      ))}
    </ul>
  );
}
