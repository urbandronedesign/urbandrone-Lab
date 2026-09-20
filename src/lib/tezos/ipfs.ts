import { IPFS_GATEWAYS, OBJKT_CDN } from './config';

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

/**
 * Every URL a URI can be fetched from, in preference order: objkt's CDN for
 * bare CIDs (fast, range requests, CORS), then the public gateways.
 */
export function ipfsCandidates(uri: string | null | undefined): string[] {
  if (!uri) return [];
  const p = parseIpfs(uri);
  if (!p) return /^https?:\/\//i.test(uri) ? [uri] : [];
  const gateways = IPFS_GATEWAYS.map((_, i) => ipfsToHttp(uri, i)!);
  return p.path ? gateways : [`${OBJKT_CDN}${p.cid}/artifact`, ...gateways];
}
