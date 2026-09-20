import type { MediaKind } from './types';

/** Classify a token by MIME type into how the gallery should render it. */
export function mediaKind(mime: string): MediaKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/x-directory' || mime === 'text/html') return 'interactive';
  return 'other';
}

/** GIF/animated originals should be shown at full size instead of the still WebP. */
export function isAnimatedMime(mime: string): boolean {
  return mime === 'image/gif' || mime === 'image/apng';
}
