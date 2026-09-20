import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSyncProgress, runSync } from '@/lib/tezos/sync';
import { tezosWallets } from '@/lib/tezos/config';

export const dynamic = 'force-dynamic';

/** Current sync progress (poll while a sync runs). */
export async function GET() {
  return NextResponse.json({ progress: getSyncProgress(), wallets: tezosWallets() });
}

/** Start a sync in the background; body: { full?: boolean, media?: boolean }. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { full?: boolean; media?: boolean };
  if (getSyncProgress().running) {
    return NextResponse.json({ error: 'A sync is already running' }, { status: 409 });
  }
  if (tezosWallets().length === 0) {
    return NextResponse.json({ error: 'TEZOS_WALLETS is not set in .env' }, { status: 400 });
  }
  // Fire and forget; the client polls GET for progress.
  void runSync({ full: body.full, media: body.media }).then(() => revalidatePath('/'));
  return NextResponse.json({ started: true }, { status: 202 });
}
