import { db } from '@/lib/db';
import { Gallery } from '@/components/gallery/Gallery';
import type { Project } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RawProject = Awaited<ReturnType<typeof db.project.findMany>>[number];

function serialize(p: RawProject): Project {
  return {
    id: p.id,
    title: p.title,
    year: p.year,
    category: p.category,
    description: p.description,
    credits: p.credits,
    coverId: p.coverId,
    cover: p.cover
      ? {
          id: p.cover.id,
          url: p.cover.url,
          width: p.cover.width,
          height: p.cover.height,
          alt: p.cover.alt,
        }
      : null,
    images: p.images.map((im) => ({
      id: im.id,
      url: im.url,
      width: im.width,
      height: im.height,
      alt: im.alt,
    })),
    order: p.order,
    published: p.published,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default async function Home() {
  let projects: Project[] = [];
  try {
    const raw = await db.project.findMany({
      where: { published: true },
      orderBy: { order: 'asc' },
      include: { cover: true, images: { orderBy: { createdAt: 'asc' } } },
    });
    projects = raw.map(serialize);
  } catch (e) {
    // Database may not be ready yet (fresh clone). The client will show
    // a friendly empty state and offer to seed demo content.
    console.error('Home: failed to load projects', e);
  }

  return <Gallery initialProjects={projects} />;
}
