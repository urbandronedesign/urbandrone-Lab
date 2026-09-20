import { getPublishedProjects } from '@/lib/content';
import { getBio } from '@/lib/bio';
import { getSite } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * /llms.txt — a plain-text map of the site for AI assistants and crawlers
 * (llmstxt.org convention): who this is, what is here, and where.
 */
export async function GET() {
  const [site, bio, projects] = await Promise.all([getSite(), getBio(), getPublishedProjects()]);
  const base = (site.url || 'https://urbandrone.xyz').replace(/\/$/, '');
  const by = (s: string) => projects.filter((p) => p.section === s);
  const line = (p: (typeof projects)[number]) => {
    const summary = (p.description || '').split(/\n/)[0].replace(/\s+/g, ' ').trim().slice(0, 160);
    const works = p.media.length ? ` (${p.media.length} work${p.media.length === 1 ? '' : 's'}, ${p.year})` : ` (${p.year})`;
    return `- [${p.title}](${base}/${p.section}/${p.slug}/)${works}${summary ? `: ${summary}` : ''}`;
  };
  const text = `# ${site.name}

> ${site.description || site.tagline}

${bio.text ? bio.text.split(/\n{2,}/)[0].trim() + '\n' : ''}
Author: ${site.author || site.name}. Site: ${base}. Works are minted on the Tezos blockchain; each work page links to its objkt.com listing and to the original file on IPFS.
${site.links.length ? site.links.map((l) => `- ${l.label}: ${l.url}`).join('\n') + '\n' : ''}
## Pages

- [Home](${base}/): selected works, latest lab entries, about
- [Artworks](${base}/artworks/): ${by('artworks').length} collections, series and single works
- [Collabs](${base}/collabs/): ${by('collabs').length} collaborations
- [Lab](${base}/lab/): ${by('lab').length} tools, course manuals and experiments
- [Bio](${base}/bio/): biography (EN/FR) and CV

## Artworks

${by('artworks').map(line).join('\n')}
${by('collabs').length ? `\n## Collabs\n\n${by('collabs').map(line).join('\n')}\n` : ''}
## Lab

${by('lab').map(line).join('\n')}

## Optional

- [Sitemap](${base}/sitemap.xml)
- [Bio](${base}/bio/): full biography in English and French
`;
  return new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
