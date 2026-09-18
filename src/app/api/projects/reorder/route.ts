import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

// Body: { order: string[] } — array of project IDs in the desired order
export async function POST(req: NextRequest) {
  try {
    const { order } = (await req.json()) as { order: string[] };
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'order must be an array of project ids' }, { status: 400 });
    }
    await db.$transaction(
      order.map((id, idx) => db.project.update({ where: { id }, data: { order: idx } }))
    );
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('POST /api/projects/reorder error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
