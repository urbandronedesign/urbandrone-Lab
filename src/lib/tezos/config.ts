// Tezos / objkt configuration. Wallets come from .env so the template can be
// reused; everything else is a sensible default.

export const OBJKT_GRAPHQL = 'https://data.objkt.com/v3/graphql';
export const OBJKT_SITE = 'https://objkt.com';

/** Minting wallets whose created tokens are synced (comma-separated in .env). */
export function tezosWallets(): string[] {
  return (process.env.TEZOS_WALLETS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * objkt's asset CDN serves every indexed artifact with byte-range support,
 * CORS and caching — public IPFS gateways refuse or throttle large files
 * (a 30 MB video gets a 403 from ipfs.io). It only knows bare CIDs, so it is
 * used first for those and the gateways below remain as fallback.
 */
export const OBJKT_CDN = 'https://assets.objkt.media/file/assets-003/';

/** IPFS gateways in order of preference (fallback after the CDN). */
export const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://w3s.link/ipfs/',
  'https://4everland.io/ipfs/',
];

/**
 * Widths of the local WebP variants generated per token image, derived from
 * the full-resolution original and never upscaled. 2400 covers a 2560px
 * display and 2x laptops at contained heights; 480 is a phone-column thumbnail.
 * (3200 was dropped: +150 MB in the repo for a marginal gain on 4K.)
 */
export const MEDIA_WIDTHS = [480, 960, 1600, 2400] as const;
export const MEDIA_QUALITY = 85;
export const PLACEHOLDER_WIDTH = 16;
export const MEDIA_DIR = 'public/media';
export const MEDIA_URL_PREFIX = '/media';
