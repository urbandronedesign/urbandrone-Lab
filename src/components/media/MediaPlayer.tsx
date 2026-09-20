'use client';

import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import type { Media } from '@/lib/types';
import { isAnimatedMime } from '@/lib/media';
import { MediaImage } from './MediaImage';

/** Walk through the gateway candidates when one fails to load. */
function useGatewaySrc(candidates: string[]) {
  const [i, setI] = useState(0);
  return {
    src: candidates[i],
    exhausted: i >= candidates.length,
    onError: () => setI((n) => Math.min(n + 1, candidates.length)),
  };
}

function OriginalImage({ media }: { media: Media }) {
  const gw = useGatewaySrc(media.original);
  if (gw.exhausted || !gw.src) return <MediaImage media={media} sizes="100vw" fit="contain" />;
  return (
    <img
      src={gw.src}
      onError={gw.onError}
      alt={media.alt}
      decoding="async"
      className="absolute inset-0 h-full w-full object-contain"
      style={media.placeholder ? { backgroundImage: `url(${media.placeholder})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } : undefined}
    />
  );
}

function Video({ media }: { media: Media }) {
  const gw = useGatewaySrc(media.original);
  if (gw.exhausted || !gw.src) return <Unavailable media={media} />;
  return (
    <video
      key={gw.src}
      src={gw.src}
      onError={gw.onError}
      poster={media.url}
      controls
      autoPlay
      loop
      playsInline
      className="absolute inset-0 h-full w-full object-contain"
    />
  );
}

function Audio({ media }: { media: Media }) {
  const gw = useGatewaySrc(media.original);
  return (
    <div className="absolute inset-0">
      <MediaImage media={media} sizes="100vw" fit="contain" />
      {gw.src && !gw.exhausted && (
        <audio key={gw.src} src={gw.src} onError={gw.onError} controls autoPlay className="absolute bottom-6 left-1/2 w-[min(90%,480px)] -translate-x-1/2" />
      )}
    </div>
  );
}

/** Interactive pieces load only on request, inside a sandboxed frame. */
function Interactive({ media }: { media: Media }) {
  const [open, setOpen] = useState(false);
  const gw = useGatewaySrc(media.original);
  if (!open) {
    return (
      <div className="absolute inset-0">
        <MediaImage media={media} sizes="100vw" fit="contain" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 bg-white/90 px-4 py-2 tracking-mono text-[10px] uppercase tracking-[0.25em] text-black transition hover:bg-white"
        >
          <Play className="h-3.5 w-3.5" /> Run interactive piece
        </button>
      </div>
    );
  }
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

function Unavailable({ media }: { media: Media }) {
  return (
    <div className="absolute inset-0">
      <MediaImage media={media} sizes="100vw" fit="contain" />
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1.5 tracking-mono text-[10px] uppercase tracking-[0.2em] text-white/80">
        Media unavailable from IPFS right now
      </p>
    </div>
  );
}

/** Full-size rendering of one Media item (lightbox). */
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
        <a href={media.objktUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 transition hover:text-foreground">
          objkt <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {media.original[0] && (
        <a href={media.original[0]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 transition hover:text-foreground">
          original <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
