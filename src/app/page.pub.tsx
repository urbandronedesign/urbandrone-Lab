import { db } from '@/lib/db';
import { Gallery } from '@/components/gallery/Gallery';
import { projectInclude, serializeProject } from '@/lib/serialize';
import type { Project } from '@/lib/types';

// Rendered per request in dev; once, at build time, for the static export —
// which is when the published projects (and their Tezos tokens) get embedded.
export default async function Home() {
  let projects: Project[] = [];
  try {
    const raw = await db.project.findMany({
      where: { published: true },
      orderBy: { order: 'asc' },
      include: projectInclude,
    });
    // Skip projects with nothing to show (e.g. all tokens hidden)
    projects = raw.map(serializeProject).filter((p) => p.media.length > 0);
  } catch (e) {
    // Database may not be ready yet (fresh clone). The client will show
    // a friendly empty state pointing to the admin.
    console.error('Home: failed to load projects', e);
  }

  return <Gallery initialProjects={projects} />;
}
