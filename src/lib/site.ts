// Site-wide info (name, tagline, SEO text, links). One row in the database,
// edited at /admin/site, read at build time for the static export.

import { db } from './db';

export { DEFAULT_SITE, type SiteInfo, type SiteLink } from './site-types';
import { DEFAULT_SITE, type SiteInfo, type SiteLink } from './site-types';

export function parseLinks(json: string): SiteLink[] {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((l) => l && typeof l.label === 'string' && typeof l.url === 'string' && l.label.trim() && l.url.trim())
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }));
  } catch {
    return [];
  }
}

export async function getSite(): Promise<SiteInfo> {
  try {
    const row = await db.site.findUnique({ where: { id: 'site' } });
    if (!row) return DEFAULT_SITE;
    return {
      name: row.name || DEFAULT_SITE.name,
      tagline: row.tagline,
      description: row.description,
      author: row.author,
      copyright: row.copyright,
      email: row.email,
      url: row.url,
      keywords: row.keywords.split(',').map((k) => k.trim()).filter(Boolean),
      links: parseLinks(row.linksJson),
      about: row.about,
      goatcounterCode: row.goatcounterCode,
    };
  } catch (e) {
    // Fresh clone without a DB yet: fall back to defaults so the build still works
    console.error('getSite failed', e);
    return DEFAULT_SITE;
  }
}

export async function saveSite(input: Partial<SiteInfo>): Promise<SiteInfo> {
  const data = {
    ...(input.name !== undefined ? { name: input.name.trim() || DEFAULT_SITE.name } : {}),
    ...(input.tagline !== undefined ? { tagline: input.tagline.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description.trim() } : {}),
    ...(input.author !== undefined ? { author: input.author.trim() } : {}),
    ...(input.copyright !== undefined ? { copyright: input.copyright.trim() } : {}),
    ...(input.email !== undefined ? { email: input.email.trim() } : {}),
    ...(input.url !== undefined ? { url: input.url.trim().replace(/\/+$/, '') } : {}),
    ...(input.keywords !== undefined ? { keywords: input.keywords.map((k) => k.trim()).filter(Boolean).join(',') } : {}),
    ...(input.links !== undefined ? { linksJson: JSON.stringify(parseLinks(JSON.stringify(input.links))) } : {}),
    ...(input.about !== undefined ? { about: input.about.trim() } : {}),
    ...(input.goatcounterCode !== undefined ? { goatcounterCode: input.goatcounterCode.trim() } : {}),
  };
  await db.site.upsert({ where: { id: 'site' }, create: { id: 'site', ...data }, update: data });
  return getSite();
}

/** `Name — Tagline`, or just the name. */
export function siteTitle(site: SiteInfo): string {
  const who = [site.author, site.tagline].filter(Boolean).join(', ');
  return who ? `${site.name} — ${who}` : site.name;
}
