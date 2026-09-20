// Everything the admin dashboard shows. Runs on the admin's machine only.

import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { db } from './db';
import { getSyncProgress } from './tezos/sync';
import { MEDIA_DIR } from './tezos/config';
import { getSite } from './site';

const exec = promisify(execFile);
const ROOT = process.cwd();

// ---------------------------------------------------------------- content
export type ContentStats = {
  projects: { total: number; published: number; drafts: number; featured: number; artworks: number; lab: number; collabs: number };
  tokens: { total: number; hidden: number; withMedia: number; images: number; videos: number; other: number; contracts: number };
  uploads: number;
  mediaBytes: number;
  mediaFiles: number;
  uploadsBytes: number;
  lastSync: string | null;
  tokensByYear: { year: string; count: number }[];
};

async function dirSize(rel: string): Promise<{ bytes: number; files: number }> {
  try {
    const dir = path.join(/* turbopackIgnore: true */ ROOT, rel);
    const names = await fs.readdir(/* turbopackIgnore: true */ dir);
    let bytes = 0;
    for (const n of names) bytes += (await fs.stat(/* turbopackIgnore: true */ path.join(dir, n))).size;
    return { bytes, files: names.length };
  } catch {
    return { bytes: 0, files: 0 };
  }
}

export async function contentStats(): Promise<ContentStats> {
  const [projects, tokens, uploads, media, up, lastSync] = await Promise.all([
    db.project.findMany({ select: { published: true, featured: true, section: true } }),
    db.token.findMany({ select: { hidden: true, mediaKey: true, mime: true, contract: true, mintedAt: true } }),
    db.image.count(),
    dirSize(MEDIA_DIR),
    dirSize('public/uploads'),
    db.setting.findUnique({ where: { key: 'tezos:lastSync' } }),
  ]);
  const byYear = new Map<string, number>();
  for (const t of tokens) {
    const y = t.mintedAt ? String(t.mintedAt.getFullYear()) : '—';
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }
  return {
    projects: {
      total: projects.length,
      published: projects.filter((p) => p.published).length,
      drafts: projects.filter((p) => !p.published).length,
      featured: projects.filter((p) => p.featured).length,
      artworks: projects.filter((p) => p.section === 'artworks').length,
      lab: projects.filter((p) => p.section === 'lab').length,
      collabs: projects.filter((p) => p.section === 'collabs').length,
    },
    tokens: {
      total: tokens.length,
      hidden: tokens.filter((t) => t.hidden).length,
      withMedia: tokens.filter((t) => t.mediaKey).length,
      images: tokens.filter((t) => t.mime.startsWith('image/')).length,
      videos: tokens.filter((t) => t.mime.startsWith('video/')).length,
      other: tokens.filter((t) => !t.mime.startsWith('image/') && !t.mime.startsWith('video/')).length,
      contracts: new Set(tokens.map((t) => t.contract)).size,
    },
    uploads,
    mediaBytes: media.bytes,
    mediaFiles: media.files,
    uploadsBytes: up.bytes,
    lastSync: lastSync?.value ?? null,
    tokensByYear: [...byYear.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([year, count]) => ({ year, count })),
  };
}

// ---------------------------------------------------------------- git / publish
export type GitState = {
  available: boolean;
  branch: string;
  changed: number; // uncommitted files
  changedFiles: string[];
  ahead: number; // commits not yet pushed
  lastCommit: { hash: string; subject: string; date: string } | null;
  remote: { owner: string; repo: string } | null;
};

async function git(...args: string[]): Promise<string> {
  const { stdout } = await exec('git', args, { cwd: ROOT, windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
}

export async function gitState(): Promise<GitState> {
  try {
    const [branch, status, log, remoteUrl] = await Promise.all([
      git('rev-parse', '--abbrev-ref', 'HEAD'),
      git('status', '--porcelain'),
      git('log', '-1', '--format=%h%x1f%s%x1f%cI'),
      git('remote', 'get-url', 'origin').catch(() => ''),
    ]);
    let ahead = 0;
    try {
      ahead = Number(await git('rev-list', '--count', `origin/${branch}..HEAD`));
    } catch {
      /* no upstream yet */
    }
    const files = status ? status.split('\n').map((l) => l.slice(3).trim()) : [];
    const [hash, subject, date] = log.split('\x1f');
    const m = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    return {
      available: true,
      branch,
      changed: files.length,
      changedFiles: files.slice(0, 50),
      ahead,
      lastCommit: hash ? { hash, subject, date } : null,
      remote: m ? { owner: m[1], repo: m[2] } : null,
    };
  } catch {
    return { available: false, branch: '', changed: 0, changedFiles: [], ahead: 0, lastCommit: null, remote: null };
  }
}

/** git add -A && git commit && git push. Returns the new commit hash. */
export async function publish(message: string): Promise<{ hash: string; pushed: boolean; output: string }> {
  const state = await gitState();
  if (!state.available) throw new Error('git is not available');
  const out: string[] = [];
  if (state.changed > 0) {
    await git('add', '-A');
    out.push(await git('commit', '-q', '-m', message.trim() || `Content update ${new Date().toISOString().slice(0, 10)}`));
  } else if (state.ahead === 0) {
    throw new Error('Nothing to publish — no changes and nothing waiting to be pushed');
  }
  const { stdout, stderr } = await exec('git', ['push', 'origin', state.branch], { cwd: ROOT, windowsHide: true });
  out.push(stdout, stderr);
  const hash = await git('rev-parse', '--short', 'HEAD');
  return { hash, pushed: true, output: out.filter(Boolean).join('\n').trim() };
}

// ---------------------------------------------------------------- deploy (GitHub Actions)
export type DeployState = {
  configured: boolean;
  status: string; // queued | in_progress | completed
  conclusion: string | null; // success | failure | …
  startedAt: string | null;
  updatedAt: string | null;
  headSha: string | null;
  message: string | null;
  url: string | null;
  pagesUrl: string | null;
};

export async function deployState(remote: GitState['remote']): Promise<DeployState> {
  const empty: DeployState = { configured: false, status: '', conclusion: null, startedAt: null, updatedAt: null, headSha: null, message: null, url: null, pagesUrl: null };
  if (!remote) return empty;
  const headers: Record<string, string> = { accept: 'application/vnd.github+json', 'user-agent': 'urbandrone admin' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${remote.owner}/${remote.repo}/actions/runs?per_page=1`, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ...empty, configured: true };
    const j = (await res.json()) as { workflow_runs: { status: string; conclusion: string | null; run_started_at: string; updated_at: string; head_sha: string; head_commit: { message: string } | null; html_url: string }[] };
    const r = j.workflow_runs[0];
    const site = await getSite();
    if (!r) return { ...empty, configured: true, pagesUrl: site.url || null };
    return {
      configured: true,
      status: r.status,
      conclusion: r.conclusion,
      startedAt: r.run_started_at,
      updatedAt: r.updated_at,
      headSha: r.head_sha.slice(0, 7),
      message: r.head_commit?.message.split('\n')[0] ?? null,
      url: r.html_url,
      pagesUrl: site.url || null,
    };
  } catch {
    return { ...empty, configured: true };
  }
}

// ---------------------------------------------------------------- analytics (GoatCounter API)
export type AnalyticsReport = {
  configured: boolean; // site code set AND api token present
  code: string | null;
  error: string | null;
  range: { start: string; end: string };
  totals: { visitors: number; today: number; perDay: number; countries: number };
  daily: { date: string; visitors: number }[];
  pages: { path: string; visitors: number }[];
  countries: { code: string; name: string; visitors: number }[];
  referrers: { source: string; visitors: number }[];
  browsers: { name: string; visitors: number }[];
  systems: { name: string; visitors: number }[];
};

let gcCache: { at: number; report: AnalyticsReport } | null = null;
const GC_TTL_MS = 10 * 60 * 1000;

export function analyticsConfigured(): { token: boolean } {
  return { token: !!process.env.GOATCOUNTER_API_TOKEN?.trim() };
}

type HitStat = { id?: string; name: string; count: number };

export async function analyticsReport(force = false): Promise<AnalyticsReport> {
  const site = await getSite();
  const code = site.goatcounterCode || null;
  const token = process.env.GOATCOUNTER_API_TOKEN?.trim();
  const end = new Date();
  const start = new Date(end.getTime() - 29 * 864e5);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const range = { start: iso(start), end: iso(end) };
  const empty: AnalyticsReport = {
    configured: false, code, error: null, range,
    totals: { visitors: 0, today: 0, perDay: 0, countries: 0 },
    daily: [], pages: [], countries: [], referrers: [], browsers: [], systems: [],
  };
  if (!code || !token) return empty;
  if (!force && gcCache && Date.now() - gcCache.at < GC_TTL_MS) return gcCache.report;

  const base = `https://${code}.goatcounter.com/api/v0`;
  const q = `start=${range.start}T00:00:00Z&end=${iso(new Date(end.getTime() + 864e5))}T00:00:00Z`;
  const get = async <T,>(pathAndQuery: string): Promise<T> => {
    const res = await fetch(`${base}${pathAndQuery}`, {
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'urbandrone admin' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`GoatCounter ${res.status} on ${pathAndQuery.split('?')[0]}${res.status === 401 ? ' — check GOATCOUNTER_API_TOKEN' : ''}`);
    return (await res.json()) as T;
  };

  try {
    // Four calls, sequential to stay well under the 4 req/s limit
    const total = await get<{ total: number; stats: { day: string; daily: number }[] }>(`/stats/total?${q}`);
    const hits = await get<{ hits: { path: string; count: number; event: boolean }[] }>(`/stats/hits?${q}&limit=10`);
    const locations = await get<{ stats: HitStat[] }>(`/stats/locations?${q}&limit=250`);
    const refs = await get<{ stats: HitStat[] }>(`/stats/toprefs?${q}&limit=10`);
    let browsers: HitStat[] = [];
    let systems: HitStat[] = [];
    try {
      browsers = (await get<{ stats: HitStat[] }>(`/stats/browsers?${q}&limit=6`)).stats;
      systems = (await get<{ stats: HitStat[] }>(`/stats/systems?${q}&limit=6`)).stats;
    } catch {
      /* optional */
    }
    const daily = (total.stats ?? []).map((d) => ({ date: d.day.slice(0, 10), visitors: d.daily }));
    const countries = (locations.stats ?? []).filter((c) => c.id && c.count > 0).map((c) => ({ code: c.id!.toUpperCase(), name: c.name || c.id!, visitors: c.count }));
    const report: AnalyticsReport = {
      configured: true, code, error: null, range,
      totals: {
        visitors: total.total ?? daily.reduce((n, d) => n + d.visitors, 0),
        today: daily.find((d) => d.date === range.end)?.visitors ?? 0,
        perDay: daily.length ? Math.round(daily.reduce((n, d) => n + d.visitors, 0) / daily.length) : 0,
        countries: countries.length,
      },
      daily,
      pages: (hits.hits ?? []).filter((h) => !h.event).map((h) => ({ path: h.path, visitors: h.count })),
      countries,
      referrers: (refs.stats ?? []).map((r) => ({ source: r.name || '(direct)', visitors: r.count })),
      browsers: browsers.map((b) => ({ name: b.name, visitors: b.count })),
      systems: systems.map((b) => ({ name: b.name, visitors: b.count })),
    };
    gcCache = { at: Date.now(), report };
    return report;
  } catch (e: any) {
    return { ...empty, configured: true, error: e?.message ?? String(e) };
  }
}
