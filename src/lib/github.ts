// Resolve "latest release" download links at build time.
//
// A project link pointing at `https://github.com/<owner>/<repo>/releases[/latest]`
// is turned into a Download block: version, date and one direct link per
// platform, taken from the newest release's assets. Runs during the static
// export (and per request in dev), so the links follow every new release
// without touching the site.

import type { ProjectLink } from './types';

export type ReleaseAsset = {
  name: string;
  url: string;
  size: number;
  platform: 'windows' | 'mac-arm64' | 'mac-x64' | 'mac' | 'linux' | 'other';
  label: string;
};

export type ReleaseInfo = {
  label: string; // the project link's label
  owner: string;
  repo: string;
  tag: string;
  name: string;
  publishedAt: string;
  htmlUrl: string; // the release page
  releasesUrl: string; // all releases
  assets: ReleaseAsset[];
};

const RELEASES_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/releases(?:\/latest)?\/?$/i;

export function parseReleasesUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(RELEASES_RE);
  return m ? { owner: m[1], repo: m[2] } : null;
}

const IGNORE_RE = /\.(blockmap|yml|yaml|txt|sha\d*|sig|json)$/i;

function classify(name: string): { platform: ReleaseAsset['platform']; label: string } {
  const n = name.toLowerCase();
  if (n.endsWith('.exe') || n.endsWith('.msi')) return { platform: 'windows', label: 'Windows' };
  if (n.endsWith('.dmg') || n.endsWith('.pkg')) {
    if (/arm64|aarch64|apple|silicon/.test(n)) return { platform: 'mac-arm64', label: 'macOS · Apple Silicon' };
    if (/x64|x86_64|intel/.test(n)) return { platform: 'mac-x64', label: 'macOS · Intel' };
    return { platform: 'mac', label: 'macOS' };
  }
  if (n.endsWith('.appimage') || n.endsWith('.deb') || n.endsWith('.rpm') || n.endsWith('.snap')) return { platform: 'linux', label: 'Linux' };
  if (n.endsWith('.zip') || n.endsWith('.tar.gz') || n.endsWith('.7z')) {
    if (/win/.test(n)) return { platform: 'windows', label: 'Windows · zip' };
    if (/arm64/.test(n)) return { platform: 'mac-arm64', label: 'macOS · Apple Silicon · zip' };
    if (/x64|x86_64/.test(n) && /mac|darwin|osx/.test(n)) return { platform: 'mac-x64', label: 'macOS · Intel · zip' };
    if (/linux/.test(n)) return { platform: 'linux', label: 'Linux · archive' };
  }
  return { platform: 'other', label: name };
}

const ORDER: ReleaseAsset['platform'][] = ['windows', 'mac-arm64', 'mac-x64', 'mac', 'linux', 'other'];

const cache = new Map<string, Promise<ReleaseInfo | null>>();

async function fetchLatest(owner: string, repo: string, label: string): Promise<ReleaseInfo | null> {
  const headers: Record<string, string> = { accept: 'application/vnd.github+json', 'user-agent': 'urbandrone.xyz build' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, { headers });
    if (!res.ok) {
      console.warn(`[github] ${owner}/${repo}: HTTP ${res.status}`);
      return null;
    }
    const r = (await res.json()) as {
      tag_name: string;
      name: string | null;
      published_at: string;
      html_url: string;
      assets: { name: string; browser_download_url: string; size: number }[];
    };
    // One asset per platform: prefer installers (exe/dmg/AppImage) over archives, drop duplicates
    const seen = new Set<string>();
    const assets: ReleaseAsset[] = r.assets
      .filter((a) => !IGNORE_RE.test(a.name))
      .map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size, ...classify(a.name) }))
      .sort((a, b) => ORDER.indexOf(a.platform) - ORDER.indexOf(b.platform) || Number(/zip|tar|7z/i.test(a.name)) - Number(/zip|tar|7z/i.test(b.name)))
      .filter((a) => {
        const key = a.platform === 'other' ? a.name : a.platform;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    // Unrecognised archives only matter when nothing better exists
    const classified = assets.filter((a) => a.platform !== 'other');
    const finalAssets = classified.length ? classified : assets;
    return {
      label,
      owner,
      repo,
      tag: r.tag_name,
      name: r.name || r.tag_name,
      publishedAt: r.published_at,
      htmlUrl: r.html_url,
      releasesUrl: `https://github.com/${owner}/${repo}/releases`,
      assets: finalAssets,
    };
  } catch (e) {
    console.warn(`[github] ${owner}/${repo}:`, (e as Error).message);
    return null;
  }
}

/** Latest-release info for every GitHub releases link among `links` (memoised per process). */
export async function resolveDownloads(links: ProjectLink[]): Promise<ReleaseInfo[]> {
  const out: ReleaseInfo[] = [];
  const done = new Set<string>();
  for (const l of links) {
    const p = parseReleasesUrl(l.url);
    if (!p) continue;
    const key = `${p.owner}/${p.repo}`.toLowerCase();
    if (done.has(key)) continue; // one block per repository
    done.add(key);
    if (!cache.has(key)) cache.set(key, fetchLatest(p.owner, p.repo, l.label));
    const info = await cache.get(key)!;
    if (info) out.push({ ...info, label: l.label });
  }
  return out;
}

export function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}
