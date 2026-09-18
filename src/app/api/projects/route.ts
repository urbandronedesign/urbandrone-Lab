import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === 'true';
  const projects = await db.project.findMany({
    where: all ? undefined : { published: true },
    orderBy: { order: 'asc' },
    include: {
      cover: true,
      images: { orderBy: { createdAt: 'asc' } },
    },
  });
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, year, category, description, credits, published, coverId, imageIds, order } = body as {
      title: string;
      year: number;
      category: string;
      description?: string;
      credits?: string;
      published?: boolean;
      coverId?: string | null;
      imageIds?: string[];
      order?: number;
    };

    if (!title || !year || !category) {
      return NextResponse.json({ error: 'title, year, category are required' }, { status: 400 });
    }

    // Determine next order if not provided
    let orderValue = order;
    if (orderValue === undefined) {
      const max = await db.project.aggregate({ _max: { order: true } });
      orderValue = (max._max.order ?? -1) + 1;
    }

    const project = await db.project.create({
      data: {
        title,
        year,
        category,
        description: description ?? '',
        credits: credits ?? '',
        published: published ?? true,
        order: orderValue,
        coverId: coverId ?? null,
        images: imageIds?.length
          ? { connect: imageIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { cover: true, images: { orderBy: { createdAt: 'asc' } } },
    });

    // If coverId was not provided but images exist, use the first as cover
    if (!project.coverId && project.images.length > 0) {
      const first = project.images[0];
      await db.project.update({ where: { id: project.id }, data: { coverId: first.id } });
    }

    revalidatePath('/');
    return NextResponse.json({ project }, { status: 201 });
  } catch (e: any) {
    console.error('POST /api/projects error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
