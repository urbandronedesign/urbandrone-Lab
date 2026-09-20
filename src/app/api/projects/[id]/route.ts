import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { projectInclude, serializeProject } from '@/lib/serialize';
import { presentationFields, uniqueSlug, type ProjectBody } from '@/lib/projects';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await db.project.findUnique({ where: { id }, include: projectInclude });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ project: serializeProject(project) });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as ProjectBody;
    const { title, year, category, description, credits, published, coverId, coverTokenId, imageIds, tokenIds, order, slug } = body;

    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Replace the image set when provided
    if (imageIds !== undefined) {
      await db.project.update({ where: { id }, data: { images: { set: [] } } });
    }
    // Replace the token set (and its order) when provided. Contract projects
    // get their membership from the sync, so only the order is honoured there.
    if (tokenIds !== undefined) {
      const allowed =
        existing.source === 'contract'
          ? new Set((await db.projectToken.findMany({ where: { projectId: id }, select: { tokenId: true } })).map((x) => x.tokenId))
          : null;
      const next = tokenIds.filter((t) => !allowed || allowed.has(t));
      await db.$transaction([
        db.projectToken.deleteMany({ where: { projectId: id, ...(allowed ? { tokenId: { notIn: next } } : {}) } }),
        ...(allowed ? [] : next.map((tokenId, i) => db.projectToken.create({ data: { projectId: id, tokenId, order: i } }))),
        ...(allowed
          ? next.map((tokenId, i) => db.projectToken.update({ where: { projectId_tokenId: { projectId: id, tokenId } }, data: { order: i } }))
          : []),
      ]);
    }

    await db.project.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(year !== undefined ? { year } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(credits !== undefined ? { credits } : {}),
        ...(published !== undefined ? { published } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(slug !== undefined ? { slug: await uniqueSlug(slug.trim() || title || existing.title, id) } : {}),
        ...presentationFields(body),
        ...(coverId !== undefined ? { coverId: coverId || null } : {}),
        ...(coverTokenId !== undefined ? { coverTokenId: coverTokenId || null } : {}),
        ...(imageIds !== undefined && imageIds.length ? { images: { connect: imageIds.map((i) => ({ id: i })) } } : {}),
      },
    });

    // Auto-pick a cover if none is set
    let project = await db.project.findUniqueOrThrow({ where: { id }, include: projectInclude });
    if (!project.coverId && !project.coverTokenId) {
      const firstToken = project.tokens[0]?.tokenId;
      const firstImage = project.images[0]?.id;
      if (firstToken || firstImage) {
        project = await db.project.update({
          where: { id },
          data: firstToken ? { coverTokenId: firstToken } : { coverId: firstImage },
          include: projectInclude,
        });
      }
    }

    revalidatePath('/');
    return NextResponse.json({ project: serializeProject(project) });
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
