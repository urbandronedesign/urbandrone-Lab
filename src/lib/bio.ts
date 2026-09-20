// Biography page content: one row, edited at /admin/bio, read at build time.

import { db } from './db';
import type { Image } from './types';

export type CvEntry = { group: string; year: string; text: string; url: string };

export type BioInfo = {
  headline: string;
  text: string;
  portrait: Image | null;
  cv: CvEntry[];
};

export const DEFAULT_BIO: BioInfo = { headline: '', text: '', portrait: null, cv: [] };

/** Suggested CV groups, in display order; unknown groups follow alphabetically. */
export const CV_GROUPS = ['Exhibitions', 'Awards', 'Talks & workshops', 'Teaching', 'Press', 'Education', 'Collections'];

export function parseCv(json: string): CvEntry[] {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => e && typeof e.text === 'string' && e.text.trim())
      .map((e) => ({
        group: String(e.group ?? '').trim() || 'Other',
        year: String(e.year ?? '').trim(),
        text: String(e.text).trim(),
        url: String(e.url ?? '').trim(),
      }));
  } catch {
    return [];
  }
}

/** Entries grouped in CV_GROUPS order (then alphabetical), each group newest first. */
export function groupCv(cv: CvEntry[]): { group: string; entries: CvEntry[] }[] {
  const byGroup = new Map<string, CvEntry[]>();
  for (const e of cv) byGroup.set(e.group, [...(byGroup.get(e.group) ?? []), e]);
  const order = (g: string) => {
    const i = CV_GROUPS.findIndex((x) => x.toLowerCase() === g.toLowerCase());
    return i === -1 ? CV_GROUPS.length : i;
  };
  return [...byGroup.entries()]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([group, entries]) => ({ group, entries: [...entries].sort((a, b) => b.year.localeCompare(a.year)) }));
}

export async function getBio(): Promise<BioInfo> {
  try {
    const row = await db.bio.findUnique({ where: { id: 'bio' }, include: { portrait: true } });
    if (!row) return DEFAULT_BIO;
    return {
      headline: row.headline,
      text: row.text,
      portrait: row.portrait
        ? { id: row.portrait.id, url: row.portrait.url, width: row.portrait.width, height: row.portrait.height, alt: row.portrait.alt }
        : null,
      cv: parseCv(row.cvJson),
    };
  } catch (e) {
    console.error('getBio failed', e);
    return DEFAULT_BIO;
  }
}

export async function saveBio(input: { headline?: string; text?: string; portraitId?: string | null; cv?: CvEntry[] }): Promise<BioInfo> {
  const data = {
    ...(input.headline !== undefined ? { headline: input.headline.trim() } : {}),
    ...(input.text !== undefined ? { text: input.text.trim() } : {}),
    ...(input.portraitId !== undefined ? { portraitId: input.portraitId || null } : {}),
    ...(input.cv !== undefined ? { cvJson: JSON.stringify(parseCv(JSON.stringify(input.cv))) } : {}),
  };
  await db.bio.upsert({ where: { id: 'bio' }, create: { id: 'bio', ...data }, update: data });
  return getBio();
}
