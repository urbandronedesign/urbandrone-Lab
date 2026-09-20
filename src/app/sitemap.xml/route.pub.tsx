import { getPublishedProjects } from '@/lib/content';
import { getSite } from '@/lib/site';

export const dynamic = 'force-static';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** All public URLs with their last change, for search engines. */
export async function GET() {
  const site = await getSite();
  const base = (site.url || 'https://urbandrone.xyz').replace(/\/$/, '');
  const projects = await getPublishedProjects();
  const latest = (ps: typeof projects) => ps.reduce<string | null>((d, p) => (!d || p.updatedAt > d ? p.updatedAt : d), null);
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);
  const rows: { loc: string; lastmod: string | null; freq: string; prio: string }[] = [
    { loc: `${base}/`, lastmod: day(latest(projects)), freq: 'weekly', prio: '1.0' },
    { loc: `${base}/artworks/`, lastmod: day(latest(projects.filter((p) => p.section === 'artworks'))), freq: 'weekly', prio: '0.9' },
    { loc: `${base}/collabs/`, lastmod: day(latest(projects.filter((p) => p.section === 'collabs'))), freq: 'monthly', prio: '0.7' },
    { loc: `${base}/lab/`, lastmod: day(latest(projects.filter((p) => p.section === 'lab'))), freq: 'monthly', prio: '0.8' },
    { loc: `${base}/bio/`, lastmod: null, freq: 'monthly', prio: '0.7' },
    ...projects.map((p) => ({ loc: `${base}/${p.section}/${p.slug}/`, lastmod: day(p.updatedAt), freq: 'monthly', prio: p.featured ? '0.8' : '0.6' })),
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    rows
      .map((r) => {
        const p = projects.find((x) => `${base}/${x.section}/${x.slug}/` === r.loc);
        const img = p?.cover && !p.cover.url.startsWith('http') ? `\n    <image:image><image:loc>${esc(base + p.cover.url)}</image:loc><image:title>${esc(p.title)}</image:title></image:image>` : '';
        return `  <url>\n    <loc>${esc(r.loc)}</loc>${r.lastmod ? `\n    <lastmod>${r.lastmod}</lastmod>` : ''}\n    <changefreq>${r.freq}</changefreq>\n    <priority>${r.prio}</priority>${img}\n  </url>`;
      })
      .join('\n') +
    `\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
