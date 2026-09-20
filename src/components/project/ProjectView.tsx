'use client';

import { useGalleryStore } from '@/lib/store';
import type { Media, Project } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaImage, MediaKindBadge } from '@/components/media/MediaImage';
import { MediaLinks, MediaPlayer } from '@/components/media/MediaPlayer';
import { ChevronLeft, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { useEffect, useCallback, useState } from 'react';
import { Footer } from '@/components/gallery/Footer';

const ease = [0.16, 1, 0.3, 1] as const;

function ImageViewer({
  images,
  index,
  onChange,
  onClose,
}: {
  images: Media[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const current = images[index];
  const [direction, setDirection] = useState(0);

  const go = useCallback(
    (delta: number) => {
      setDirection(delta);
      const next = (index + delta + images.length) % images.length;
      onChange(next);
    },
    [index, images.length, onChange]
  );

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [go, onClose]);

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease }}
      className="fixed inset-0 z-50 bg-black"
      role="dialog"
      aria-modal="true"
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center text-white/70 transition hover:text-white"
        aria-label="Close fullscreen view"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 tracking-mono text-[10px] uppercase tracking-[0.25em] text-white/70">
        {String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
      </div>

      {/* Image */}
      <div className="absolute inset-0 flex items-center justify-center p-6 md:p-12">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={current.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 40 }}
            transition={{ duration: 0.5, ease }}
            className="relative h-full w-full"
          >
            <MediaPlayer media={current} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Caption + links */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between gap-4 text-white/70">
        <span className="truncate font-display text-lg italic">{current.title}</span>
        <MediaLinks media={current} className="pointer-events-auto flex shrink-0 gap-4 tracking-mono text-[10px] uppercase tracking-[0.25em]" />
      </div>

      {/* Prev / Next */}
      <button
        type="button"
        onClick={() => go(-1)}
        className="group absolute left-0 top-0 flex h-full w-1/4 items-center justify-start p-4 text-white/0 transition hover:text-white/80"
        aria-label="Previous image"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 opacity-0 transition group-hover:opacity-100">
          <ChevronLeft className="h-6 w-6" />
        </span>
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="group absolute right-0 top-0 flex h-full w-1/4 items-center justify-end p-4 text-white/0 transition hover:text-white/80"
        aria-label="Next image"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 opacity-0 transition group-hover:opacity-100">
          <ChevronRight className="h-6 w-6" />
        </span>
      </button>
    </motion.div>
  );
}

function Thumbnails({
  images,
  index,
  onSelect,
}: {
  images: Media[];
  index: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="thin-scrollbar mt-6 flex gap-3 overflow-x-auto pb-2">
      {images.map((im, i) => (
        <button
          key={im.id}
          type="button"
          onClick={() => onSelect(i)}
          className={
            'relative aspect-[4/3] w-24 shrink-0 overflow-hidden border transition ' +
            (i === index
              ? 'border-foreground'
              : 'border-transparent hover:border-border')
          }
          aria-label={`View image ${i + 1}`}
        >
          <MediaImage media={im} sizes="96px" />
          <MediaKindBadge media={im} className="bottom-1 left-1 px-1 text-[7px]" />
        </button>
      ))}
    </div>
  );
}

export function ProjectView({ id, allProjects }: { id: string; allProjects: Project[] }) {
  const setView = useGalleryStore((s) => s.setView);
  const openProject = useGalleryStore((s) => s.openProject);
  const lightboxOpen = useGalleryStore((s) => s.lightboxOpen);
  const setLightboxOpen = useGalleryStore((s) => s.setLightboxOpen);
  const lightboxIndex = useGalleryStore((s) => s.lightboxIndex);
  const setLightboxIndex = useGalleryStore((s) => s.setLightboxIndex);

  const project = allProjects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="font-display text-2xl italic">Project not found.</p>
        <button
          onClick={() => setView('gallery')}
          className="tracking-mono text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
        >
          ← Back to index
        </button>
      </div>
    );
  }

  const images = project.media;
  const currentIdx = Math.max(0, Math.min(lightboxIndex, images.length - 1));
  const current = images[currentIdx] ?? project.cover;

  // prev/next project navigation
  const idx = allProjects.findIndex((p) => p.id === id);
  const prev = idx > 0 ? allProjects[idx - 1] : null;
  const next = idx >= 0 && idx < allProjects.length - 1 ? allProjects[idx + 1] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease }}
      className="flex flex-col"
    >
      {/* Top bar */}
      <div className="mx-auto w-full max-w-[1600px] px-6 pt-6 md:px-12 lg:px-24">
        <button
          type="button"
          onClick={() => setView('gallery')}
          className="inline-flex items-center gap-2 tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Index
        </button>
      </div>

      {/* Main image */}
      <div className="mx-auto mt-4 w-full max-w-[1600px] px-6 md:px-12 lg:px-24">
        <div className="relative aspect-[16/10] w-full overflow-hidden md:aspect-[16/9] lg:aspect-[2.35/1]">
          {current && (
            <motion.button
              type="button"
              key={current.id}
              onClick={() => {
                setLightboxIndex(currentIdx);
                setLightboxOpen(true);
              }}
              initial={{ opacity: 0, scale: 1.01 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease }}
              className="group relative block h-full w-full"
              aria-label="Open fullscreen"
            >
              <MediaImage
                media={current}
                priority
                sizes="100vw"
                className="transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02]"
              />
              <MediaKindBadge media={current} className="bottom-4 left-4" />
              <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/10" />
              <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black opacity-0 transition group-hover:opacity-100">
                <span className="tracking-mono text-[10px]">↗</span>
              </div>
            </motion.button>
          )}
        </div>

        {/* Image navigation row */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => {
              const ni = (currentIdx - 1 + images.length) % images.length;
              setLightboxIndex(ni);
            }}
            className="inline-flex items-center gap-1 transition hover:text-foreground"
            disabled={images.length <= 1}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="tracking-mono uppercase tracking-[0.25em] text-[10px]">
            {String(currentIdx + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => {
              const ni = (currentIdx + 1) % images.length;
              setLightboxIndex(ni);
            }}
            className="inline-flex items-center gap-1 transition hover:text-foreground"
            disabled={images.length <= 1}
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <Thumbnails images={images} index={currentIdx} onSelect={setLightboxIndex} />
      </div>

      {/* Caption block */}
      <div className="mx-auto mt-16 grid w-full max-w-[1600px] grid-cols-1 gap-10 px-6 pb-16 md:grid-cols-12 md:px-12 lg:px-24">
        <div className="md:col-span-4">
          <p className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {project.category}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-[0.95] tracking-tight md:text-5xl lg:text-6xl text-balance">
            {project.title}
          </h1>
          <p className="mt-3 tracking-mono text-xs text-muted-foreground">{project.year}</p>
        </div>

        <div className="md:col-span-1" />

        <div className="md:col-span-7">
          <div className="prose prose-stone max-w-none text-foreground/85">
            {project.description.split(/\n\n+/).map((para, i) => (
              <p key={i} className="text-base leading-relaxed md:text-lg" style={{ marginTop: i === 0 ? 0 : '1.25em' }}>
                {para}
              </p>
            ))}
          </div>
          {project.credits && (
            <div className="mt-8 border-t border-border pt-4 tracking-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {project.credits}
            </div>
          )}
        </div>
      </div>

      {/* Prev/Next project */}
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 gap-px border-t border-border bg-border text-foreground">
        <button
          type="button"
          disabled={!prev}
          onClick={() => prev && openProject(prev.id)}
          className="group flex flex-col items-start gap-1 bg-background p-6 text-left transition hover:bg-foreground hover:text-background md:p-10 disabled:opacity-30"
        >
          <span className="tracking-mono text-[10px] uppercase tracking-[0.25em] opacity-60">
            ← Previous
          </span>
          <span className="font-display text-2xl italic md:text-3xl">
            {prev ? prev.title : '—'}
          </span>
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={() => next && openProject(next.id)}
          className="group flex flex-col items-end gap-1 bg-background p-6 text-right transition hover:bg-foreground hover:text-background md:p-10 disabled:opacity-30"
        >
          <span className="tracking-mono text-[10px] uppercase tracking-[0.25em] opacity-60">
            Next →
          </span>
          <span className="font-display text-2xl italic md:text-3xl">
            {next ? next.title : '—'}
          </span>
        </button>
      </div>

      <Footer projectCount={allProjects.length} />

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && images.length > 0 && (
          <ImageViewer
            images={images}
            index={lightboxIndex}
            onChange={setLightboxIndex}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
