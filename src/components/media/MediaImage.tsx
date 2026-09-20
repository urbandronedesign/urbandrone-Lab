'use client';

import type { Media } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Responsive image for a Media item. Uses the local WebP variants via
 * `srcset` and shows the blur placeholder as a background until the picture
 * paints — no JS needed, so it also works before hydration.
 */
export function MediaImage({
  media,
  sizes,
  className,
  priority = false,
  fit = 'cover',
}: {
  media: Media;
  sizes: string;
  className?: string;
  priority?: boolean;
  fit?: 'cover' | 'contain';
}) {
  return (
    <img
      src={media.url}
      srcSet={media.srcSet ?? undefined}
      sizes={media.srcSet ? sizes : undefined}
      alt={media.alt}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      draggable={false}
      className={cn('absolute inset-0 h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain', className)}
      style={
        media.placeholder && fit === 'cover'
          ? { backgroundImage: `url(${media.placeholder})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    />
  );
}

/** Small corner badge for non-still media (video, interactive, audio). */
export function MediaKindBadge({ media, className }: { media: Media; className?: string }) {
  if (media.kind === 'image') return null;
  const label = media.kind === 'video' ? '▶ video' : media.kind === 'audio' ? '♪ audio' : media.kind === 'interactive' ? '⟐ interactive' : '⟐ ' + (media.mime || 'file');
  return (
    <span
      className={cn(
        'pointer-events-none absolute bottom-2 left-2 z-10 bg-black/60 px-1.5 py-0.5 tracking-mono text-[9px] uppercase tracking-[0.2em] text-white',
        className
      )}
    >
      {label}
    </span>
  );
}
