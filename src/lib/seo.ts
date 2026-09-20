// SEO helpers: canonical URLs, descriptions and JSON-LD structured data
// (schema.org) for search engines and AI crawlers.

import type { Metadata } from 'next';
import type { BioInfo } from './bio';
import type { ReleaseInfo } from './github';
import type { SiteInfo } from './site-types';
import type { Project } from './types';

export const FALLBACK_BASE = 'https://urbandrone.xyz';

export function baseUrl(site: SiteInfo): string {
  return (site.url || FALLBACK_BASE).replace(/\/$/, '');
}

export function absolute(site: SiteInfo, path: string): string {
  return path.startsWith('http') ? path : `${baseUrl(site)}${path}`;
}

/** Cut a text at a word boundary so it fits a search snippet (~160 chars). */
export function clip(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 3).replace(/\s+\S*$/, '')}…` : t;
}

/** Search-friendly title: "<title> — <category>, <year>" while it fits with the site name appended (≤ 60 chars). */
export function projectTitle(p: Project, site: SiteInfo): string {
  const suffix = ` — ${site.name}`;
  const candidates = p.section === 'lab' ? [`${p.title} — ${p.category}`, p.title] : [`${p.title} — ${p.category}, ${p.year}`, `${p.title}, ${p.year}`, p.title];
  return candidates.find((c) => (c + suffix).length <= 60) ?? p.title;
}

/** Generated one-line summary used when a project has little or no text. */
function generatedDescription(p: Project, site: SiteInfo): string {
  const who = site.author || site.name;
  const n = p.media.length;
  const collection = p.tokens[0]?.collectionName;
  if (p.section === 'lab') return `${p.title} — ${p.category.toLowerCase()} by ${who}, part of the Urbandrone Lab: tools, courses and experiments from the studio.`;
  return `${p.title} — ${n === 1 ? 'a work' : `${n} works`} by ${who}, ${p.year}${p.tokens.length ? `, minted on Tezos${collection ? ` (${collection})` : ''}` : ''}. ${p.category} from the Urbandrone studio.`;
}

/** First paragraph of a project's text, completed with a generated summary when it is too short for a snippet. */
export function projectDescription(p: Project, site: SiteInfo): string {
  const first = (p.description || '').split(/\n{2,}/)[0].replace(/\s+/g, ' ').trim();
  if (first.length >= 70) return clip(first);
  return clip([first, generatedDescription(p, site)].filter(Boolean).join(' '));
}

/** Page metadata with canonical URL and Open Graph for a given path. */
export function pageMeta(site: SiteInfo, path: string, m: { title?: string; description?: string; image?: string; type?: 'website' | 'article' | 'profile' } = {}): Metadata {
  const url = absolute(site, path);
  const description = m.description ?? site.description;
  const image = m.image ? absolute(site, m.image) : `${baseUrl(site)}/og.png`;
  return {
    ...(m.title ? { title: m.title } : {}),
    description,
    alternates: { canonical: url },
    openGraph: { url, type: m.type ?? 'website', siteName: site.name, description, images: [{ url: image, alt: m.title ?? site.name }], ...(m.title ? { title: m.title } : {}) },
    twitter: { card: 'summary_large_image', description, images: [image], ...(m.title ? { title: m.title } : {}) },
  };
}

// ---------------------------------------------------------------- JSON-LD

type JsonLd = Record<string, unknown>;

export function personJsonLd(site: SiteInfo, bio?: BioInfo | null): JsonLd {
  const base = baseUrl(site);
  return {
    '@type': 'Person',
    '@id': `${base}/#person`,
    name: site.author || site.name,
    alternateName: site.author ? site.name : undefined,
    url: `${base}/bio/`,
    image: bio?.portrait ? absolute(site, bio.portrait.url) : `${base}/og.png`,
    description: bio?.headline || site.tagline || undefined,
    jobTitle: site.tagline || undefined,
    email: site.email ? `mailto:${site.email}` : undefined,
    sameAs: site.links.map((l) => l.url),
    knowsLanguage: bio?.textFr ? ['en', 'fr'] : ['en'],
  };
}

export function websiteJsonLd(site: SiteInfo): JsonLd {
  const base = baseUrl(site);
  return {
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    url: `${base}/`,
    name: site.name,
    description: site.description || undefined,
    inLanguage: 'en',
    publisher: { '@id': `${base}/#person` },
  };
}

export function breadcrumbJsonLd(site: SiteInfo, items: { name: string; path: string }[]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absolute(site, it.path) })),
  };
}

/** A project page: a VisualArtwork (artworks/collabs), or a SoftwareApplication / CreativeWork (lab). */
export function projectJsonLd(p: Project, site: SiteInfo, downloads: ReleaseInfo[] = []): JsonLd {
  const base = baseUrl(site);
  const url = `${base}/${p.section}/${p.slug}/`;
  const cover = p.cover ?? p.media[0];
  const common = {
    '@id': `${url}#work`,
    name: p.title,
    url,
    description: projectDescription(p, site),
    image: cover ? absolute(site, cover.url) : undefined,
    dateCreated: String(p.year),
    keywords: p.tags.length ? p.tags.join(', ') : undefined,
    creator: { '@id': `${base}/#person` },
    author: { '@id': `${base}/#person` },
    inLanguage: 'en',
  };
  if (p.section === 'lab') {
    if (downloads.length) {
      const r = downloads[0];
      return {
        '@type': 'SoftwareApplication',
        ...common,
        applicationCategory: /course|manual/i.test(p.category) ? 'EducationalApplication' : 'MultimediaApplication',
        softwareVersion: r.version.replace(/^v/i, ''),
        datePublished: r.publishedAt.slice(0, 10),
        operatingSystem: [...new Set(r.assets.map((a) => (a.platform.startsWith('mac') ? 'macOS' : a.platform === 'windows' ? 'Windows' : a.platform === 'linux' ? 'Linux' : null)).filter(Boolean))].join(', ') || undefined,
        downloadUrl: r.assets.map((a) => a.url),
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        codeRepository: p.links.find((l) => /github\.com\/[^/]+\/[^/]+\/?$/.test(l.url))?.url,
      };
    }
    return { '@type': 'CreativeWork', ...common, genre: p.category };
  }
  const tokens = p.tokens.filter((t) => !t.hidden);
  const kinds = new Set(p.media.map((m) => m.kind));
  return {
    '@type': 'VisualArtwork',
    ...common,
    artform: kinds.has('video') ? 'Digital video' : kinds.has('interactive') ? 'Interactive digital art' : 'Digital art',
    artMedium: 'Digital, generative',
    genre: p.category,
    ...(tokens.length
      ? {
          isPartOf: tokens[0].collectionName ? { '@type': 'Collection', name: tokens[0].collectionName } : undefined,
          hasPart: tokens.slice(0, 50).map((t) => ({
            '@type': 'VisualArtwork',
            name: t.name,
            url: t.objktUrl,
            image: t.thumb && !t.thumb.startsWith('http') ? absolute(site, t.thumb) : t.thumb || undefined,
            dateCreated: t.mintedAt ? t.mintedAt.slice(0, 10) : undefined,
          })),
          sameAs: tokens.length === 1 ? tokens[0].objktUrl : undefined,
        }
      : {}),
  };
}

/** Wrap one or more entities in a single @graph document. */
export function graph(...items: (JsonLd | null | undefined)[]): JsonLd {
  return { '@context': 'https://schema.org', '@graph': items.filter(Boolean) };
}
