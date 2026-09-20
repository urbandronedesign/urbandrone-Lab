// Pure helpers shared by the sync (Node) and the serializer (server components).
import { createHash } from 'crypto';

/** Stable key for a token's preview URI → filenames under public/media. */
export function mediaKeyFor(uri: string): string {
  return createHash('sha1').update(uri).digest('hex').slice(0, 16);
}

export function mediaFile(key: string, width: number): string {
  return `${key}-${width}.webp`;
}

/**
 * Which URI to derive the local image variants from, per token. Images use
 * the full-resolution artifact (hic et nunc's display_uri is only a 1024px
 * preview); everything else uses its still (display/thumbnail).
 */
export function previewUri(t: {
  mime: string;
  displayUri: string;
  artifactUri: string;
  thumbnailUri: string;
}): string | null {
  const isImage = t.mime.startsWith('image/') && t.mime !== 'image/svg+xml';
  return (isImage ? t.artifactUri || t.displayUri : t.displayUri || t.thumbnailUri) || null;
}
