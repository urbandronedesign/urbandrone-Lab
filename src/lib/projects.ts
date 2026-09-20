// Project helpers shared by the API routes and the Tezos sync.

import { db } from './db';

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
  section?: 'artworks' | 'lab';
  slug?: string;
  featured?: boolean;
  tags?: string[];
  links?: { label: string; url: string }[];
};

export function slugify(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'project'
  );
}

/** A slug no other project uses (appends -2, -3, …). */
export async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base);
  for (let i = 1; ; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    const taken = await db.project.findUnique({ where: { slug: candidate } });
    if (!taken || taken.id === excludeId) return candidate;
  }
}

/** The optional presentation fields, normalised for Prisma. */
export function presentationFields(body: ProjectBody) {
  return {
    ...(body.section !== undefined ? { section: body.section === 'lab' ? 'lab' : 'artworks' } : {}),
    ...(body.featured !== undefined ? { featured: !!body.featured } : {}),
    ...(body.tags !== undefined ? { tags: body.tags.map((t) => t.trim()).filter(Boolean).join(',') } : {}),
    ...(body.links !== undefined
      ? {
          linksJson: JSON.stringify(
            body.links.filter((l) => l.label?.trim() && l.url?.trim()).map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
          ),
        }
      : {}),
  };
}
