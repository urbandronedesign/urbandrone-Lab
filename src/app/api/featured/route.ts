import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { HOME_FEATURED } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** Admin only (proxy.ts). Body: { ids: string[] } — the featured projects, in order (max HOME_FEATURED). */
export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { ids?: unknown };
    if (!Array.isArray(body.ids) || body.ids.some((x) => typeof x !== 'string')) {
      return NextResponse.json({ error: 'ids must be a list of project ids' }, { status: 400 });
    }
    const ids = [...new Set(body.ids as string[])].slice(0, HOME_FEATURED);
    await db.$transaction([
      db.project.updateMany({ where: { id: { notIn: ids } }, data: { featured: false, featuredOrder: 0 } }),
      ...ids.map((id, i) => db.project.update({ where: { id }, data: { featured: true, featuredOrder: i } })),
    ]);
    revalidatePath('/');
    return NextResponse.json({ ok: true, ids, max: HOME_FEATURED });
  } catch (e: any) {
    console.error('PUT /api/featured error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
