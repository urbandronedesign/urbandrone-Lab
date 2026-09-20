import { NextRequest, NextResponse } from 'next/server';
import { analyticsConfigured, analyticsReport, contentStats, deployState, gitState } from '@/lib/dashboard';
import { getSyncProgress } from '@/lib/tezos/sync';
import { tezosWallets } from '@/lib/tezos/config';
import { getSite } from '@/lib/site';

export const dynamic = 'force-dynamic';

/** Admin only (proxy.ts). ?refresh=1 bypasses the analytics cache. */
export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get('refresh') === '1';
  const git = await gitState();
  const [content, deploy, analytics, site] = await Promise.all([contentStats(), deployState(git.remote), analyticsReport(refresh), getSite()]);
  return NextResponse.json({
    content,
    git,
    deploy,
    analytics,
    analyticsEnv: analyticsConfigured(),
    sync: getSyncProgress(),
    wallets: tezosWallets(),
    site: { name: site.name, url: site.url, gaMeasurementId: site.gaMeasurementId },
    generatedAt: new Date().toISOString(),
  });
}
