import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { projectInclude, serializeProject } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === 'true';
  const projects = await db.project.findMany({
    where: all ? undefined : { published: true },
    orderBy: { order: 'asc' },
    include: projectInclude,
  });
  return NextResponse.json({ projects: projects.map(serializeProject) });
}

export type ProjectBody = {
  title?: string;
  year?: number;
  category?: string;
  description?: string;
  credits?: string;
  published?: boolean;
  coverId?: string | null;
  coverTokenId?: string | null;
  imageIds?: string[];
  tokenIds?: string[];
  order?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProjectBody;
    const { title, year, category, description, credits, published, coverId, coverTokenId, imageIds, tokenIds, order } = body;

    if (!title || !year || !category) {
      return NextResponse.json({ error: 'title, year, category are required' }, { status: 400 });
    }

    // Determine next order if not provided
    let orderValue = order;
    if (orderValue === undefined) {
      const max = await db.project.aggregate({ _max: { order: true } });
      orderValue = (max._max.order ?? -1) + 1;
    }

    const created = await db.project.create({
      data: {
        title,
        year,
        category,
        description: description ?? '',
        credits: credits ?? '',
        published: published ?? true,
        order: orderValue,
        coverId: coverId ?? null,
        coverTokenId: coverTokenId ?? null,
        images: imageIds?.length ? { connect: imageIds.map((id) => ({ id })) } : undefined,
        tokens: tokenIds?.length
          ? { create: tokenIds.map((tokenId, i) => ({ tokenId, order: i })) }
          : undefined,
      },
      include: projectInclude,
    });

    // Default cover: first token, else first image
    if (!created.coverId && !created.coverTokenId) {
      const firstToken = created.tokens[0]?.tokenId;
      const firstImage = created.images[0]?.id;
      if (firstToken || firstImage) {
        await db.project.update({
          where: { id: created.id },
          data: firstToken ? { coverTokenId: firstToken } : { coverId: firstImage },
        });
      }
    }

    const project = await db.project.findUniqueOrThrow({ where: { id: created.id }, include: projectInclude });
    revalidatePath('/');
    return NextResponse.json({ project: serializeProject(project) }, { status: 201 });
  } catch (e: any) {
    console.error('POST /api/projects error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
