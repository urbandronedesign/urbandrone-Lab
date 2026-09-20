import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { serializeToken } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

/** Curation flags on a token (currently: hidden). Chain data is read-only. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { hidden?: boolean };
    if (typeof body.hidden !== 'boolean') {
      return NextResponse.json({ error: 'hidden (boolean) is required' }, { status: 400 });
    }
    const token = await db.token.update({ where: { id: decodeURIComponent(id) }, data: { hidden: body.hidden } });
    // Hidden tokens also leave their contract project
    if (body.hidden) await db.projectToken.deleteMany({ where: { tokenId: token.id, project: { source: 'contract' } } });
    else {
      const project = await db.project.findUnique({ where: { contract: token.contract }, include: { tokens: true } });
      if (project && !project.tokens.some((pt) => pt.tokenId === token.id)) {
        const order = project.tokens.reduce((m, pt) => Math.max(m, pt.order), -1) + 1;
        await db.projectToken.create({ data: { projectId: project.id, tokenId: token.id, order } });
      }
    }
    revalidatePath('/');
    return NextResponse.json({ token: serializeToken(token) });
  } catch (e: any) {
    console.error('PATCH /api/tokens/[id] error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
