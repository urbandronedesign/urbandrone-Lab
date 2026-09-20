import { NextRequest, NextResponse } from 'next/server';
import { analyticsConfigured, analyticsReport, contentStats, deployState, gitState, type AnalyticsReport } from '@/lib/dashboard';
import { getSyncProgress } from '@/lib/tezos/sync';
import { tezosWallets } from '@/lib/tezos/config';
import { getSite } from '@/lib/site';

export const dynamic = 'force-dynamic';

/** Admin only (proxy.ts). ?refresh=1 bypasses the analytics cache. */
export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get('refresh') === '1';
  // ?mock=1 (dev only): sample traffic so the card can be previewed before GoatCounter is connected
  const mock = process.env.NODE_ENV !== 'production' && req.nextUrl.searchParams.get('mock') === '1';
  const git = await gitState();
  const [content, deploy, analytics, site] = await Promise.all([contentStats(), deployState(git.remote), mock ? mockReport() : analyticsReport(refresh), getSite()]);
  return NextResponse.json({
    content,
    git,
    deploy,
    analytics,
    analyticsEnv: analyticsConfigured(),
    sync: getSyncProgress(),
    wallets: tezosWallets(),
    site: { name: site.name, url: site.url, goatcounterCode: mock ? site.goatcounterCode || 'demo' : site.goatcounterCode },
    generatedAt: new Date().toISOString(),
  });
}

function mockReport(): AnalyticsReport {
  const end = new Date();
  const day = (i: number) => new Date(end.getTime() - i * 864e5).toISOString().slice(0, 10);
  const daily = Array.from({ length: 30 }, (_, i) => ({ date: day(29 - i), visitors: 8 + Math.round(12 * Math.abs(Math.sin(i / 3))) + (i % 7 === 5 ? 20 : 0) }));
  const countries = [
    ['FR', 'France', 212], ['US', 'United States', 143], ['DE', 'Germany', 61], ['GB', 'United Kingdom', 54], ['JP', 'Japan', 37], ['BR', 'Brazil', 29],
    ['CA', 'Canada', 24], ['NL', 'Netherlands', 22], ['ES', 'Spain', 19], ['IT', 'Italy', 17], ['AU', 'Australia', 12], ['IN', 'India', 11], ['KR', 'South Korea', 9],
    ['MX', 'Mexico', 8], ['AR', 'Argentina', 6], ['PT', 'Portugal', 6], ['CH', 'Switzerland', 5], ['BE', 'Belgium', 5], ['MA', 'Morocco', 4], ['ZA', 'South Africa', 3], ['NG', 'Nigeria', 2], ['TR', 'Türkiye', 2], ['CN', 'China', 2], ['NZ', 'New Zealand', 1],
  ].map(([code, name, visitors]) => ({ code: code as string, name: name as string, visitors: visitors as number }));
  return {
    configured: true, code: 'demo', error: null, range: { start: day(29), end: day(0) },
    totals: { visitors: daily.reduce((n, d) => n + d.visitors, 0), today: daily[29].visitors, perDay: Math.round(daily.reduce((n, d) => n + d.visitors, 0) / 30), countries: countries.length },
    daily,
    countries,
    pages: [['/', 412], ['/artworks/', 188], ['/artworks/stasis/', 96], ['/lab/', 71], ['/lab/artlux/', 58], ['/bio/', 44], ['/artworks/diatoms/', 39]].map(([path, visitors]) => ({ path: path as string, visitors: visitors as number })),
    referrers: [['(direct)', 301], ['objkt.com', 142], ['x.com', 88], ['Google', 63], ['instagram.com', 21]].map(([source, visitors]) => ({ source: source as string, visitors: visitors as number })),
    browsers: [['Chrome', 388], ['Safari', 176], ['Firefox', 61], ['Edge', 22]].map(([name, visitors]) => ({ name: name as string, visitors: visitors as number })),
    systems: [['Windows', 231], ['macOS', 204], ['iOS', 133], ['Android', 71], ['Linux', 12]].map(([name, visitors]) => ({ name: name as string, visitors: visitors as number })),
  };
}
