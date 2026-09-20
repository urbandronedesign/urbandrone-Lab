// Local media pipeline: fetch a token's display image from IPFS once, derive
// small WebP variants + a blur placeholder, store them under public/media.
// Filenames are content-addressed (hash of the IPFS URI) so they never change
// and can be cached by browsers indefinitely.

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { MEDIA_DIR, MEDIA_QUALITY, MEDIA_WIDTHS, PLACEHOLDER_WIDTH } from './config';
import { ipfsCandidates } from './ipfs';
import { mediaFile, mediaKeyFor } from './paths';

export { mediaFile, mediaKeyFor };

const FETCH_TIMEOUT_MS = 45_000;
const MAX_BYTES = 80 * 1024 * 1024;
// Public gateways rate-limit per IP. Space requests out globally and retry
// 429/5xx with a growing pause before moving on to the next gateway.
const MIN_SPACING_MS = 700;
const RETRIES_PER_GATEWAY = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let nextSlot = 0;
async function pace() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + MIN_SPACING_MS;
  if (at > now) await sleep(at - now);
}

class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

export type ProcessedMedia = {
  mediaKey: string;
  mediaWidths: number[];
  placeholder: string;
  width: number;
  height: number;
};

async function fetchWithTimeout(url: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    await pace();
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new HttpError(res.status);
    const len = Number(res.headers.get('content-length'));
    if (len > MAX_BYTES) throw new Error(`too large (${len} bytes)`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error(`too large (${buf.length} bytes)`);
    return buf;
  } finally {
    clearTimeout(t);
  }
}

/** Try each gateway in turn; the first one that answers wins. */
export async function fetchIpfs(uri: string): Promise<Buffer> {
  const errors: string[] = [];
  for (const url of ipfsCandidates(uri)) {
    for (let attempt = 0; attempt <= RETRIES_PER_GATEWAY; attempt++) {
      try {
        return await fetchWithTimeout(url);
      } catch (e: any) {
        const status = e instanceof HttpError ? e.status : 0;
        errors.push(`${new URL(url).host}: ${e?.name === 'AbortError' ? 'timeout' : e?.message}`);
        // Retry the same gateway only when it asked us to slow down or hiccuped
        if ((status === 429 || status >= 500) && attempt < RETRIES_PER_GATEWAY) {
          await sleep(3000 * (attempt + 1));
          continue;
        }
        break;
      }
    }
  }
  throw new Error(`all gateways failed for ${uri} — ${errors.join(' | ')}`);
}

/** True when every variant for this key already exists on disk. */
export async function hasVariants(key: string, widths: number[], root = process.cwd()): Promise<boolean> {
  for (const w of widths) {
    try {
      await fs.access(path.join(root, MEDIA_DIR, mediaFile(key, w)));
    } catch {
      return false;
    }
  }
  return widths.length > 0;
}

/**
 * Download `uri` and write the WebP variants. Never upscales: widths larger
 * than the source are skipped (the largest source-sized one is kept).
 */
export async function processImage(uri: string, root = process.cwd()): Promise<ProcessedMedia> {
  const key = mediaKeyFor(uri);
  const dir = path.join(root, MEDIA_DIR);
  await fs.mkdir(dir, { recursive: true });

  const buf = await fetchIpfs(uri);
  // `animated: false` → first frame for GIF/animated WebP; the original still plays in the lightbox.
  const base = sharp(buf, { animated: false }).rotate();
  const meta = await base.metadata();
  const srcW = meta.width ?? 0;
  const srcH = meta.height ?? 0;
  if (!srcW || !srcH) throw new Error('could not read image dimensions');

  const widths: number[] = [];
  for (const w of MEDIA_WIDTHS) {
    if (w > srcW && widths.length > 0) break; // don't upscale beyond the first size
    const target = Math.min(w, srcW);
    await base
      .clone()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: MEDIA_QUALITY, effort: 4 })
      .toFile(path.join(dir, mediaFile(key, w)));
    widths.push(w);
    if (target < w) break;
  }

  const ph = await base
    .clone()
    .resize({ width: PLACEHOLDER_WIDTH, withoutEnlargement: true })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    mediaKey: key,
    mediaWidths: widths,
    placeholder: `data:image/webp;base64,${ph.toString('base64')}`,
    width: srcW,
    height: srcH,
  };
}
