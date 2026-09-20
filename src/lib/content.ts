// Read-side helpers for the public pages (run at build time in the static export).

import { db } from './db';
import { projectInclude, serializeProject } from './serialize';
import type { Project, ProjectSection } from './types';

export async function getPublishedProjects(section?: ProjectSection): Promise<Project[]> {
  try {
    const raw = await db.project.findMany({
      where: { published: true, ...(section ? { section } : {}) },
      orderBy: { order: 'asc' },
      include: projectInclude,
    });
    // Artworks and collabs need something to show; lab entries may be text only.
    return raw.map(serializeProject).filter((p) => p.section === 'lab' || p.media.length > 0);
  } catch (e) {
    console.error('getPublishedProjects failed', e);
    return [];
  }
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  try {
    const raw = await db.project.findFirst({ where: { slug, published: true }, include: projectInclude });
    return raw ? serializeProject(raw) : null;
  } catch {
    return null;
  }
}

/** Featured artworks for the home page, falling back to the first ones. */
export function pickFeatured(projects: Project[], n = 6): Project[] {
  const featured = projects.filter((p) => p.featured);
  return (featured.length ? featured : projects).slice(0, n);
}
