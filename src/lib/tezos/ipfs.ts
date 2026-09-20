import { IPFS_GATEWAYS } from './config';

/** `ipfs://<cid>[/path]` → `{ cid, path }`; null for anything that is not IPFS. */
export function parseIpfs(uri: string | null | undefined): { cid: string; path: string } | null {
  if (!uri) return null;
  const m = uri.match(/^ipfs:\/\/(?:ipfs\/)?([^/?#]+)(\/[^?#]*)?/i);
  if (!m) return null;
  return { cid: m[1], path: m[2] ?? '' };
}

/** Resolve an `ipfs://` URI on the n-th gateway. Non-IPFS URLs are returned as-is. */
export function ipfsToHttp(uri: string | null | undefined, gateway = 0): string | null {
  if (!uri) return null;
  const p = parseIpfs(uri);
  if (!p) return /^https?:\/\//i.test(uri) ? uri : null;
  const base = IPFS_GATEWAYS[gateway % IPFS_GATEWAYS.length];
  return `${base}${p.cid}${p.path}`;
}

/** Every gateway URL for a URI, in preference order (for client-side fallback). */
export function ipfsCandidates(uri: string | null | undefined): string[] {
  if (!uri) return [];
  if (!parseIpfs(uri)) return /^https?:\/\//i.test(uri) ? [uri] : [];
  return IPFS_GATEWAYS.map((_, i) => ipfsToHttp(uri, i)!);
}
