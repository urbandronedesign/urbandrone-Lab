'use client';

import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import type { Media } from '@/lib/types';
import { isAnimatedMime } from '@/lib/media';
import { MediaImage } from './MediaImage';

/** Walk through the source candidates (CDN, then gateways) when one fails. */
function useSources(candidates: string[]) {
  const [i, setI] = useState(0);
  return {
    src: candidates[i],
    exhausted: i >= candidates.length,
    onError: () => setI((n) => Math.min(n + 1, candidates.length)),
  };
}

/** Centred play affordance over a still; the visitor decides when to load heavy media. */
function PlayOverlay({ media, label, onPlay }: { media: Media; label: string; onPlay: () => void }) {
  return (
    <div className="absolute inset-0">
      <MediaImage media={media} sizes="100vw" fit="contain" />
      <button
        type="button"
        onClick={onPlay}
        aria-label={label}
        className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 transition-colors duration-150 hover:bg-black/10"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-transform duration-150 group-hover:scale-105">
          <Play className="ml-0.5 h-6 w-6 fill-current" strokeWidth={1.5} />
        </span>
        <span className="t-label absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80">{label}</span>
      </button>
    </div>
  );
}

function OriginalImage({ media }: { media: Media }) {
  const gw = useSources(media.original);
  if (gw.exhausted || !gw.src) return <MediaImage media={media} sizes="100vw" fit="contain" />;
  return (
    <img
      src={gw.src}
      crossOrigin="anonymous"
      onError={gw.onError}
      alt={media.alt}
      decoding="async"
      className="absolute inset-0 h-full w-full object-contain"
      style={media.placeholder ? { backgroundImage: `url(${media.placeholder})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } : undefined}
    />
  );
}

function Video({ media }: { media: Media }) {
  const [playing, setPlaying] = useState(false);
  const gw = useSources(media.original);
  if (!playing) return <PlayOverlay media={media} label="Play video" onPlay={() => setPlaying(true)} />;
  if (gw.exhausted || !gw.src) return <Unavailable media={media} />;
  return (
    <video
      key={gw.src}
      src={gw.src}
      crossOrigin="anonymous"
      onError={gw.onError}
      poster={media.url}
      controls
      autoPlay
      loop
      playsInline
      preload="none"
      className="absolute inset-0 h-full w-full bg-black object-contain"
    />
  );
}

function Audio({ media }: { media: Media }) {
  const [playing, setPlaying] = useState(false);
  const gw = useSources(media.original);
  if (!playing) return <PlayOverlay media={media} label="Play audio" onPlay={() => setPlaying(true)} />;
  return (
    <div className="absolute inset-0">
      <MediaImage media={media} sizes="100vw" fit="contain" />
      {gw.src && !gw.exhausted ? (
        <audio key={gw.src} src={gw.src} crossOrigin="anonymous" onError={gw.onError} controls autoPlay preload="none" className="absolute bottom-6 left-1/2 w-[min(90%,480px)] -translate-x-1/2" />
      ) : (
        <UnavailableNote />
      )}
    </div>
  );
}

/** Interactive pieces load only on request, inside a sandboxed frame. */
function Interactive({ media }: { media: Media }) {
  const [open, setOpen] = useState(false);
  const gw = useSources(media.original);
  if (!open) return <PlayOverlay media={media} label="Run interactive piece" onPlay={() => setOpen(true)} />;
  if (gw.exhausted || !gw.src) return <Unavailable media={media} />;
  return (
    <iframe
      key={gw.src}
      src={gw.src}
      onError={gw.onError}
      title={media.title}
      sandbox="allow-scripts allow-same-origin allow-pointer-lock"
      allow="accelerometer; autoplay; gyroscope; xr-spatial-tracking"
      className="absolute inset-0 h-full w-full border-0 bg-black"
    />
  );
}

function UnavailableNote() {
  return (
    <p className="t-label absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1.5 text-white/80">Media unavailable right now</p>
  );
}

function Unavailable({ media }: { media: Media }) {
  return (
    <div className="absolute inset-0">
      <MediaImage media={media} sizes="100vw" fit="contain" />
      <UnavailableNote />
    </div>
  );
}

/** Full-size rendering of one Media item (lightbox, editor preview). */
export function MediaPlayer({ media }: { media: Media }) {
  switch (media.kind) {
    case 'video':
      return <Video media={media} />;
    case 'audio':
      return <Audio media={media} />;
    case 'interactive':
      return <Interactive media={media} />;
    case 'image':
      // Animated originals (GIF) need the real file; stills use the local variants.
      return isAnimatedMime(media.mime) && media.original.length ? <OriginalImage media={media} /> : <MediaImage media={media} sizes="100vw" fit="contain" priority />;
    default:
      return <MediaImage media={media} sizes="100vw" fit="contain" />;
  }
}

/** Links shown under a Media item: objkt page and the original file. */
export function MediaLinks({ media, className }: { media: Media; className?: string }) {
  if (!media.objktUrl && media.original.length === 0) return null;
  return (
    <div className={className}>
      {media.objktUrl && (
        <a href={media.objktUrl} target="_blank" rel="noopener noreferrer" className="inline-flex cursor-pointer items-center gap-1 transition-colors">
          objkt <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
        </a>
      )}
      {media.original[0] && (
        <a href={media.original[0]} target="_blank" rel="noopener noreferrer" className="inline-flex cursor-pointer items-center gap-1 transition-colors">
          original <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
        </a>
      )}
    </div>
  );
}
