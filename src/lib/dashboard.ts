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
  projects: { total: number; published: number; drafts: number; featured: number; artworks: number; lab: number };
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

// ---------------------------------------------------------------- analytics (GA4 Data API)
export type AnalyticsReport = {
  configured: boolean;
  propertyId: string | null;
  error: string | null;
  range: { start: string; end: string };
  totals: { users: number; sessions: number; pageviews: number; avgEngagementSec: number };
  daily: { date: string; users: number; pageviews: number }[];
  pages: { path: string; views: number }[];
  countries: { country: string; users: number }[];
  referrers: { source: string; sessions: number }[];
  realtime: number | null;
};

let gaCache: { at: number; report: AnalyticsReport } | null = null;
const GA_TTL_MS = 10 * 60 * 1000;

export function analyticsConfigured(): { propertyId: string | null; credentials: string | null } {
  return { propertyId: process.env.GA_PROPERTY_ID?.trim() || null, credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() || null };
}

export async function analyticsReport(force = false): Promise<AnalyticsReport> {
  const { propertyId, credentials } = analyticsConfigured();
  const end = new Date();
  const start = new Date(end.getTime() - 29 * 864e5);
  const range = { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  const empty: AnalyticsReport = {
    configured: false, propertyId, error: null, range,
    totals: { users: 0, sessions: 0, pageviews: 0, avgEngagementSec: 0 },
    daily: [], pages: [], countries: [], referrers: [], realtime: null,
  };
  if (!propertyId || !credentials) return empty;
  if (!force && gaCache && Date.now() - gaCache.at < GA_TTL_MS) return gaCache.report;

  try {
    const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
    const client = new BetaAnalyticsDataClient({ keyFilename: path.isAbsolute(credentials) ? credentials : path.join(/* turbopackIgnore: true */ ROOT, credentials) });
    const property = `properties/${propertyId}`;
    const dateRanges = [{ startDate: '30daysAgo', endDate: 'today' }];

    const [[daily], [totals], [pages], [countries], [referrers], realtime] = await Promise.all([
      client.runReport({ property, dateRanges, dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }], orderBys: [{ dimension: { dimensionName: 'date' } }] }),
      client.runReport({ property, dateRanges, metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'averageSessionDuration' }] }),
      client.runReport({ property, dateRanges, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 8 }),
      client.runReport({ property, dateRanges, dimensions: [{ name: 'country' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 8 }),
      client.runReport({ property, dateRanges, dimensions: [{ name: 'sessionSource' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 }),
      client.runRealtimeReport({ property, metrics: [{ name: 'activeUsers' }] }).then(([r]) => Number(r.rows?.[0]?.metricValues?.[0]?.value ?? 0)).catch(() => null),
    ]);
    const n = (v: string | null | undefined) => Number(v ?? 0);
    const t = totals.rows?.[0]?.metricValues ?? [];
    const report: AnalyticsReport = {
      configured: true, propertyId, error: null, range,
      totals: { users: n(t[0]?.value), sessions: n(t[1]?.value), pageviews: n(t[2]?.value), avgEngagementSec: Math.round(n(t[3]?.value)) },
      daily: (daily.rows ?? []).map((r) => {
        const d = r.dimensionValues?.[0]?.value ?? '';
        return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, users: n(r.metricValues?.[0]?.value), pageviews: n(r.metricValues?.[1]?.value) };
      }),
      pages: (pages.rows ?? []).map((r) => ({ path: r.dimensionValues?.[0]?.value ?? '', views: n(r.metricValues?.[0]?.value) })),
      countries: (countries.rows ?? []).map((r) => ({ country: r.dimensionValues?.[0]?.value ?? '', users: n(r.metricValues?.[0]?.value) })),
      referrers: (referrers.rows ?? []).map((r) => ({ source: r.dimensionValues?.[0]?.value ?? '', sessions: n(r.metricValues?.[0]?.value) })),
      realtime,
    };
    gaCache = { at: Date.now(), report };
    return report;
  } catch (e: any) {
    return { ...empty, configured: true, error: e?.message ?? String(e) };
  }
}
