'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Media } from '@/lib/types';
import { MediaLinks, MediaPlayer } from '@/components/media/MediaPlayer';

/**
 * Full-screen viewer. Keyboard (← → Esc), swipe, focus trapped and returned
 * to the opener on close. Rendered only while open.
 */
export function Lightbox({
  items,
  index,
  onChange,
  onClose,
}: {
  items: Media[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const [dir, setDir] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const touchX = useRef<number | null>(null);
  const current = items[index];

  const go = useCallback(
    (delta: number) => {
      if (items.length < 2) return;
      setDir(delta);
      onChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onChange]
  );

  useEffect(() => {
    opener.current = document.activeElement;
    root.current?.focus();
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Escape') onClose();
      else if (e.key === 'Tab') {
        // keep focus inside
        const f = root.current?.querySelectorAll<HTMLElement>('button, a[href], video, audio, iframe');
        if (!f || f.length === 0) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prev;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [go, onClose]);

  if (!current) return null;

  return (
    <motion.div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`${current.title} — ${index + 1} of ${items.length}`}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#050505] text-white outline-none"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
      }}
    >
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4 md:px-6">
        <span className="t-label text-white/60">
          {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 cursor-pointer items-center justify-center text-white/70 transition-colors hover:text-white">
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Stage */}
      <div className="relative flex-1 min-h-0">
        <AnimatePresence initial={false} custom={dir} mode="wait">
          <motion.div
            key={current.id}
            custom={dir}
            initial={reduce ? false : { opacity: 0, x: dir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -dir * 24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 md:inset-x-16"
          >
            <MediaPlayer media={current} />
          </motion.div>
        </AnimatePresence>

        {items.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous" className="absolute left-0 top-1/2 hidden h-16 w-16 -translate-y-1/2 cursor-pointer items-center justify-center text-white/60 transition-colors hover:text-white md:flex">
              <ChevronLeft className="h-6 w-6" strokeWidth={1.5} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next" className="absolute right-0 top-1/2 hidden h-16 w-16 -translate-y-1/2 cursor-pointer items-center justify-center text-white/60 transition-colors hover:text-white md:flex">
              <ChevronRight className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      {/* Caption */}
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3 md:px-6">
        <span className="t-caption truncate text-white/80">{current.title}</span>
        <MediaLinks media={current} className="flex gap-5 t-label text-white/60 [&_a:hover]:text-white" />
      </div>
    </motion.div>
  );
}
