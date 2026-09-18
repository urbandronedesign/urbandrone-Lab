import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await db.project.findUnique({
    where: { id },
    include: { cover: true, images: { orderBy: { createdAt: 'asc' } } },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { title, year, category, description, credits, published, coverId, imageIds, order } = body as {
      title?: string;
      year?: number;
      category?: string;
      description?: string;
      credits?: string;
      published?: boolean;
      coverId?: string | null;
      imageIds?: string[];
      order?: number;
    };

    // Verify project exists
    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Disconnect all existing images then reconnect the new set (if provided)
    if (imageIds !== undefined) {
      await db.project.update({
        where: { id },
        data: { images: { set: [] } },
      });
    }

    const project = await db.project.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(year !== undefined ? { year } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(credits !== undefined ? { credits } : {}),
        ...(published !== undefined ? { published } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(coverId !== undefined ? { coverId: coverId || null } : {}),
        ...(imageIds !== undefined && imageIds.length
          ? { images: { connect: imageIds.map((i) => ({ id: i })) } }
          : {}),
      },
      include: { cover: true, images: { orderBy: { createdAt: 'asc' } } },
    });

    // Auto-pick cover if missing
    if (!project.coverId && project.images.length > 0) {
      await db.project.update({ where: { id }, data: { coverId: project.images[0].id } });
    }

    revalidatePath('/');
    return NextResponse.json({ project });
  } catch (e: any) {
    console.error('PUT /api/projects/[id] error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await db.project.delete({ where: { id } });
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('DELETE /api/projects/[id] error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
