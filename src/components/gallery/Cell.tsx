'use client';

import { useGalleryStore } from '@/lib/store';
import type { Project } from '@/lib/types';
import { motion } from 'framer-motion';
import Image from 'next/image';

const ease = [0.16, 1, 0.3, 1] as const;

export function Cell({ project, index }: { project: Project; index: number }) {
  const openProject = useGalleryStore((s) => s.openProject);
  const cover = project.cover ?? project.images[0];
  if (!cover) return null;

  const label = String(index + 1).padStart(2, '0');

  // Use varying cell sizes for a "gallery wall" rhythm
  // pattern repeats every 3 items: large, small, small
  const sizeClass =
    index % 5 === 0
      ? 'md:col-span-7'
      : index % 5 === 1
      ? 'md:col-span-5'
      : index % 5 === 2
      ? 'md:col-span-4'
      : index % 5 === 3
      ? 'md:col-span-4'
      : 'md:col-span-4';

  return (
    <motion.button
      type="button"
      onClick={() => openProject(project.id)}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.7, ease, delay: Math.min(index * 0.04, 0.3) }}
      className={`group relative col-span-12 ${sizeClass} block overflow-hidden text-left`}
      aria-label={`Open ${project.title}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden md:aspect-[16/10]">
        <Image
          src={cover.url}
          alt={cover.alt || project.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/10" />
      </div>

      {/* Caption row */}
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {label}
          </span>
          <h3 className="font-display truncate text-xl md:text-2xl leading-tight">
            {project.title}
          </h3>
        </div>
        <span className="tracking-mono shrink-0 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {project.year}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{project.category}</span>
        <span className="hidden tracking-mono md:inline">
          {String(project.images.length).padStart(2, '0')} images
        </span>
      </div>
    </motion.button>
  );
}
