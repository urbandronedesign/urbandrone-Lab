// Server-side: Prisma rows → the frontend `Project` / `Token` shapes.
// Used by the public page (build time) and by the admin API alike.

import type { Prisma, Token as TokenRow } from '@prisma/client';
import { MEDIA_URL_PREFIX, OBJKT_SITE } from './tezos/config';
import { ipfsCandidates, ipfsToHttp } from './tezos/ipfs';
import { mediaFile, previewUri } from './tezos/paths';
import { mediaKind } from './media';
import type { Media, Project, Token } from './types';

export const projectInclude = {
  cover: true,
  images: { orderBy: { createdAt: 'asc' } },
  coverToken: true,
  tokens: { orderBy: { order: 'asc' }, include: { token: true } },
} satisfies Prisma.ProjectInclude;

export type RawProject = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

function objktUrl(t: TokenRow): string {
  return `${OBJKT_SITE}/tokens/${t.contract}/${t.tokenId}`;
}

/** Local variant URLs for a token: `{ url, srcSet }`, or null when none were generated. */
function localVariants(t: TokenRow): { url: string; srcSet: string; widths: number[] } | null {
  if (!t.mediaKey || !t.mediaWidths) return null;
  const widths = t.mediaWidths.split(',').map(Number).filter(Boolean).sort((a, b) => a - b);
  if (widths.length === 0) return null;
  const urlFor = (w: number) => `${MEDIA_URL_PREFIX}/${mediaFile(t.mediaKey!, w)}`;
  const display = widths.find((w) => w >= 800) ?? widths[widths.length - 1];
  return {
    url: urlFor(display),
    srcSet: widths.map((w) => `${urlFor(w)} ${w}w`).join(', '),
    widths,
  };
}

export function tokenToMedia(t: TokenRow): Media {
  const local = localVariants(t);
  const kind = mediaKind(t.mime);
  const fallback = ipfsToHttp(previewUri(t)) ?? '';
  return {
    id: `tok:${t.id}`,
    kind,
    mime: t.mime,
    title: t.name,
    alt: t.name,
    width: t.width,
    height: t.height,
    url: local?.url ?? fallback,
    srcSet: local?.srcSet ?? null,
    placeholder: t.placeholder,
    original: ipfsCandidates(t.artifactUri || t.displayUri),
    objktUrl: objktUrl(t),
    tokenId: t.id,
  };
}

export function imageToMedia(im: RawProject['images'][number]): Media {
  return {
    id: `img:${im.id}`,
    kind: 'image',
    mime: '',
    title: im.alt,
    alt: im.alt,
    width: im.width,
    height: im.height,
    url: im.url,
    srcSet: null,
    placeholder: null,
    original: [],
    objktUrl: null,
    tokenId: null,
  };
}

export function serializeToken(t: TokenRow): Token {
  const local = localVariants(t);
  const thumbW = local?.widths[0];
  return {
    id: t.id,
    contract: t.contract,
    tokenId: t.tokenId,
    name: t.name,
    mime: t.mime,
    kind: mediaKind(t.mime),
    supply: t.supply,
    tags: t.tags ? t.tags.split(',') : [],
    collectionName: t.collectionName,
    collectionPath: t.collectionPath,
    mintedAt: t.mintedAt?.toISOString() ?? null,
    hidden: t.hidden,
    width: t.width,
    height: t.height,
    thumb: thumbW && t.mediaKey ? `${MEDIA_URL_PREFIX}/${mediaFile(t.mediaKey, thumbW)}` : ipfsToHttp(previewUri(t)),
    placeholder: t.placeholder,
    objktUrl: objktUrl(t),
  };
}

export function serializeProject(p: RawProject): Project {
  const tokenRows = p.tokens.map((pt) => pt.token).filter((t) => !t.hidden);
  const media: Media[] = [...tokenRows.map(tokenToMedia), ...p.images.map(imageToMedia)];
  const cover =
    (p.coverToken && !p.coverToken.hidden ? tokenToMedia(p.coverToken) : null) ??
    (p.cover ? imageToMedia(p.cover) : null) ??
    media[0] ??
    null;

  return {
    id: p.id,
    title: p.title,
    year: p.year,
    category: p.category,
    description: p.description,
    credits: p.credits,
    source: p.source === 'contract' ? 'contract' : 'manual',
    contract: p.contract,
    coverId: p.coverId,
    coverTokenId: p.coverTokenId,
    cover,
    images: p.images.map((im) => ({ id: im.id, url: im.url, width: im.width, height: im.height, alt: im.alt })),
    tokens: p.tokens.map((pt) => serializeToken(pt.token)),
    media,
    order: p.order,
    published: p.published,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
