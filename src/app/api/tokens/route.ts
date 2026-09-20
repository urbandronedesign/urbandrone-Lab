import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeToken } from '@/lib/serialize';
import { tezosWallets } from '@/lib/tezos/config';

export const dynamic = 'force-dynamic';

/** Admin-only (see proxy.ts): the full token pool with contract summaries. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const contract = q.get('contract');
  const search = q.get('q')?.trim();

  const tokens = await db.token.findMany({
    where: {
      ...(contract ? { contract } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { description: { contains: search } }, { tags: { contains: search } }] } : {}),
    },
    orderBy: { pk: 'desc' },
  });

  const grouped = await db.token.groupBy({ by: ['contract', 'collectionName'], _count: { _all: true } });
  const wallets = tezosWallets();
  const own = new Set(
    (await db.project.findMany({ where: { source: 'contract', contract: { not: null } }, select: { contract: true } })).map((p) => p.contract!)
  );
  const contracts = grouped
    .map((g) => ({ contract: g.contract, name: g.collectionName || g.contract, count: g._count._all, own: own.has(g.contract) }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ tokens: tokens.map(serializeToken), contracts, wallets });
}
