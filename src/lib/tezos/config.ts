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
 * IPFS gateways in order of preference. Used at sync time to fetch originals
 * and at runtime for full-resolution media, videos and interactive pieces.
 * Local WebP variants cover everything else, so visitors rarely hit these.
 */
export const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://w3s.link/ipfs/',
  'https://4everland.io/ipfs/',
];

/** Widths of the local WebP variants generated per token image. */
export const MEDIA_WIDTHS = [400, 800, 1600] as const;
export const MEDIA_QUALITY = 80;
export const PLACEHOLDER_WIDTH = 16;
export const MEDIA_DIR = 'public/media';
export const MEDIA_URL_PREFIX = '/media';
