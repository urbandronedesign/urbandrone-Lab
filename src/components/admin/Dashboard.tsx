'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, CircleDashed, ExternalLink, Hexagon, Loader2, RefreshCw, Upload, XCircle } from 'lucide-react';
import type { AnalyticsReport, ContentStats, DeployState, GitState } from '@/lib/dashboard';
import type { SyncProgress } from '@/lib/queries';
import { useStartSync } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminNav } from './AdminNav';
import { WorldMap } from './WorldMap';

type Data = {
  content: ContentStats;
  git: GitState;
  deploy: DeployState;
  analytics: AnalyticsReport;
  analyticsEnv: { token: boolean };
  sync: SyncProgress;
  wallets: string[];
  site: { name: string; url: string; goatcounterCode: string };
  generatedAt: string;
};

const fmtBytes = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b >= 1e6 ? `${Math.round(b / 1e6)} MB` : `${Math.round(b / 1e3)} KB`);
const fmtNum = (n: number) => n.toLocaleString('en-GB');
const ago = (iso: string | null) => {
  if (!iso) return '—';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};

/* ---------------------------------------------------------------- pieces */

function Card({ title, aside, children, className = '' }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col border border-border p-5 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="font-display text-3xl leading-none tracking-tight tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
      {hint && <p className="tracking-mono text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Horizontal bar list: magnitude in one hue, direct labels, no axis. */
function Bars({ rows, max }: { rows: { label: string; value: number; href?: string }[]; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">No data yet.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-3 text-xs" title={`${r.label}: ${fmtNum(r.value)}`}>
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              {r.href ? (
                <a href={r.href} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{r.label}</a>
              ) : (
                <span className="truncate">{r.label}</span>
              )}
            </div>
            <div className="mt-1 h-1.5 w-full bg-muted">
              <div className="h-full bg-foreground" style={{ width: `${Math.max(2, (r.value / top) * 100)}%` }} />
            </div>
          </div>
          <span className="tracking-mono text-right tabular-nums text-muted-foreground">{fmtNum(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-background px-2.5 py-1.5 text-xs shadow-sm">
      <p className="tracking-mono text-[10px] text-muted-foreground">{label}</p>
      <p className="tabular-nums">{fmtNum(payload[0].value)} visitors</p>
    </div>
  );
}

/* ---------------------------------------------------------------- dashboard */

export function Dashboard() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery<Data>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const r = await fetch('/api/dashboard');
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    refetchInterval: (q) => (q.state.data?.sync.running || q.state.data?.deploy.status === 'in_progress' || q.state.data?.deploy.status === 'queued' ? 5000 : 60000),
  });
  const startSync = useStartSync();
  const [message, setMessage] = useState('');
  const publish = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/publish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Publish failed');
      return j as { hash: string };
    },
    onSuccess: (r) => {
      toast.success(`Published ${r.hash}`, { description: 'GitHub is building the site — the deploy card follows it.' });
      setMessage('');
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: any) => toast.error('Publish failed', { description: e?.message }),
  });

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen flex-col">
        <AdminNav />
        <div className="flex flex-1 items-center justify-center">
          {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      </div>
    );
  }

  const { content: c, git, deploy, analytics: a, sync } = data;
  const pending = git.changed > 0 || git.ahead > 0;
  const deployIcon =
    deploy.status === 'completed' ? (
      deploy.conclusion === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4 text-destructive" />
    ) : (
      <CircleDashed className="h-4 w-4 animate-spin" />
    );

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} title="Refresh">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </AdminNav>

      <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 px-6 py-8 md:px-12 lg:px-24">
        {/* Row 1: publish · deploy · sync */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card
            title="Publish"
            aside={<span className="tracking-mono text-[10px] text-muted-foreground">{git.branch}</span>}
          >
            <div className="flex flex-1 flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Tile label="changed files" value={git.changed} />
                <Tile label="commits to push" value={git.ahead} />
              </div>
              {git.changedFiles.length > 0 && (
                <ul className="max-h-24 overflow-auto thin-scrollbar tracking-mono text-[10px] text-muted-foreground">
                  {git.changedFiles.map((f) => (
                    <li key={f} className="truncate">{f}</li>
                  ))}
                </ul>
              )}
              <div className="mt-auto space-y-2">
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What changed (optional)" className="h-9 text-xs" disabled={!pending} />
                <Button className="w-full" onClick={() => publish.mutate()} disabled={!pending || publish.isPending}>
                  {publish.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                  {pending ? 'Commit & push to publish' : 'Everything is published'}
                </Button>
                {git.lastCommit && (
                  <p className="truncate tracking-mono text-[10px] text-muted-foreground" title={git.lastCommit.subject}>
                    last commit {git.lastCommit.hash} · {ago(git.lastCommit.date)} · {git.lastCommit.subject}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card
            title="Deploy · GitHub Pages"
            aside={
              deploy.url && (
                <a href={deploy.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 tracking-mono text-[10px] text-muted-foreground hover:text-foreground">
                  run <ExternalLink className="h-3 w-3" />
                </a>
              )
            }
          >
            {deploy.configured ? (
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center gap-2 text-sm">
                  {deployIcon}
                  <span className="capitalize">{deploy.status === 'completed' ? deploy.conclusion ?? 'completed' : deploy.status.replace('_', ' ') || 'unknown'}</span>
                  <span className="tracking-mono text-[10px] text-muted-foreground">{ago(deploy.updatedAt)}</span>
                </div>
                {deploy.message && (
                  <p className="truncate text-xs text-muted-foreground" title={deploy.message}>
                    {deploy.headSha} · {deploy.message}
                  </p>
                )}
                {deploy.pagesUrl && (
                  <a href={deploy.pagesUrl} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1.5 text-xs underline decoration-border underline-offset-4 hover:decoration-foreground">
                    {deploy.pagesUrl.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No GitHub remote found.</p>
            )}
          </Card>

          <Card title="Tezos sync" aside={<span className="tracking-mono text-[10px] text-muted-foreground">{data.wallets.length} wallet{data.wallets.length === 1 ? '' : 's'}</span>}>
            <div className="flex flex-1 flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Tile label="tokens" value={c.tokens.total} hint={`${c.tokens.hidden} hidden · ${c.tokens.contracts} contracts`} />
                <Tile label="with local media" value={`${c.tokens.withMedia}/${c.tokens.total}`} hint={`${c.tokens.images} img · ${c.tokens.videos} video · ${c.tokens.other} other`} />
              </div>
              <p className="tracking-mono text-[10px] text-muted-foreground">
                last sync {ago(c.lastSync)}
                {sync.running && ` · ${sync.phase} ${sync.phase === 'media' ? `${sync.mediaDone}/${sync.mediaTotal}` : sync.tokensSeen}`}
                {!sync.running && sync.mediaFailed > 0 && ` · ${sync.mediaFailed} media failed (retries next sync)`}
              </p>
              <div className="mt-auto flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" disabled={sync.running || startSync.isPending} onClick={() => startSync.mutate({}, { onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }) })}>
                  {sync.running ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Hexagon className="mr-2 h-3.5 w-3.5" />}
                  Sync Tezos
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/projects">Tokens <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Row 2: content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Content" aside={<Link href="/admin/projects" className="tracking-mono text-[10px] text-muted-foreground hover:text-foreground">manage →</Link>} className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Tile label="artworks" value={c.projects.artworks} />
              <Tile label="lab entries" value={c.projects.lab} />
              <Tile label="published" value={c.projects.published} hint={`${c.projects.drafts} draft${c.projects.drafts === 1 ? '' : 's'}`} />
              <Tile label="featured on home" value={c.projects.featured} />
              <Tile label="media on disk" value={fmtBytes(c.mediaBytes)} hint={`${c.mediaFiles} WebP variants`} />
              <Tile label="uploads" value={c.uploads} hint={fmtBytes(c.uploadsBytes)} />
              <Tile label="Pages budget" value={`${Math.round(((c.mediaBytes + c.uploadsBytes) / 1e9) * 100)}%`} hint="of the 1 GB soft limit" />
            </div>
          </Card>
          <Card title="Tokens minted by year">
            <Bars rows={c.tokensByYear.map((y) => ({ label: y.year, value: y.count }))} />
          </Card>
        </div>

        {/* Row 3: analytics */}
        <Card
          title={`Traffic · last 30 days${a.configured && !a.error ? ` · ${a.range.start} → ${a.range.end}` : ''}`}
          aside={
            a.configured && !a.error ? (
              <div className="flex items-center gap-4 tracking-mono text-[10px] text-muted-foreground">
                <button type="button" onClick={() => fetch('/api/dashboard?refresh=1').then(() => refetch())} className="hover:text-foreground">refresh</button>
                <a href={`https://${a.code}.goatcounter.com`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                  open GoatCounter <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : null
          }
        >
          {!data.site.goatcounterCode ? (
            <Setup step={1} />
          ) : !a.configured ? (
            <Setup step={2} code={data.site.goatcounterCode} />
          ) : a.error ? (
            <div className="space-y-2 text-xs">
              <p className="text-destructive">{a.error}</p>
              <Setup step={2} code={data.site.goatcounterCode} compact />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <Tile label="visitors · 30 days" value={fmtNum(a.totals.visitors)} />
                <Tile label="today" value={fmtNum(a.totals.today)} />
                <Tile label="per day" value={fmtNum(a.totals.perDay)} hint="average" />
                <Tile label="countries" value={fmtNum(a.totals.countries)} />
              </div>

              <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div>
                  <p className="mb-2 tracking-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Visitors by country</p>
                  <WorldMap rows={a.countries} />
                </div>
                <div>
                  <p className="mb-3 tracking-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Top countries</p>
                  <Bars rows={a.countries.slice(0, 10).map((x) => ({ label: x.name, value: x.visitors }))} />
                </div>
              </div>

              <div>
                <p className="mb-2 tracking-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Visitors per day</p>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={a.daily} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--foreground)" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="var(--foreground)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} minTickGap={24} />
                      <YAxis width={36} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--border)' }} />
                      <Area type="monotone" dataKey="visitors" stroke="var(--foreground)" strokeWidth={2} fill="url(#pv)" dot={false} activeDot={{ r: 4, stroke: 'var(--background)', strokeWidth: 2, fill: 'var(--foreground)' }} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="mb-3 tracking-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Top pages</p>
                  <Bars rows={a.pages.map((p) => ({ label: p.path, value: p.visitors, href: data.site.url ? `${data.site.url}${p.path}` : undefined }))} />
                </div>
                <div>
                  <p className="mb-3 tracking-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Sources</p>
                  <Bars rows={a.referrers.map((x) => ({ label: x.source, value: x.visitors }))} />
                </div>
                <div>
                  <p className="mb-3 tracking-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Browsers</p>
                  <Bars rows={a.browsers.map((x) => ({ label: x.name, value: x.visitors }))} />
                </div>
                <div>
                  <p className="mb-3 tracking-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Systems</p>
                  <Bars rows={a.systems.map((x) => ({ label: x.name, value: x.visitors }))} />
                </div>
              </div>
            </div>
          )}
        </Card>

        <p className="tracking-mono text-[10px] text-muted-foreground">updated {ago(data.generatedAt)} · analytics cached 10 min</p>
      </main>
    </div>
  );
}

function Setup({ step, code, compact = false }: { step: 1 | 2; code?: string; compact?: boolean }) {
  return (
    <div className="max-w-[70ch] space-y-3 text-xs text-muted-foreground">
      {!compact && <p className="text-sm text-foreground">{step === 1 ? 'Analytics is not set up yet.' : 'Visits are being counted — add an API token to see them here.'}</p>}
      <ol className="list-decimal space-y-2 pl-5">
        <li className={step > 1 ? 'line-through' : ''}>
          Create a free account at{' '}
          <a href="https://www.goatcounter.com/signup" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">goatcounter.com</a>{' '}
          (free for personal, non-commercial sites; no cookies, so no consent bar). Choose a code — it becomes <span className="tracking-mono">code.goatcounter.com</span>.
        </li>
        <li className={step > 1 ? 'line-through' : ''}>
          Paste that code into <Link href="/admin/site" className="underline underline-offset-4">Site → Analytics</Link> and publish. The public site starts counting.
        </li>
        <li>
          In GoatCounter → <strong>Settings → API</strong>, create a token with the <em>Read statistics</em> permission and add it to <code className="tracking-mono">.env</code>:
          <pre className="mt-1 whitespace-pre-wrap bg-muted p-2 tracking-mono text-[10px] text-foreground">{'GOATCOUNTER_API_TOKEN=…'}</pre>
          Restart the dev server.
          {code ? (
            <>
              {' '}Settings live at{' '}
              <a href={`https://${code}.goatcounter.com/settings/main`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{code}.goatcounter.com/settings</a>.
            </>
          ) : null}
        </li>
      </ol>
    </div>
  );
}
