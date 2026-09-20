// Orchestrates a sync: objkt → Token rows → contract projects → local media.
// Runs in-process (admin API or CLI); progress is kept in memory for polling.

import { db } from '@/lib/db';
import { fetchCreatedTokens, type ObjktToken } from './objkt';
import { hasVariants, processImage } from './media';
import { mediaKeyFor, previewUri } from './paths';
import { tezosWallets } from './config';

export { previewUri };

export type SyncProgress = {
  running: boolean;
  phase: 'idle' | 'tokens' | 'projects' | 'media' | 'done' | 'error';
  startedAt: string | null;
  finishedAt: string | null;
  tokensSeen: number;
  tokensUpserted: number;
  projectsTouched: number;
  mediaTotal: number;
  mediaDone: number;
  mediaFailed: number;
  errors: string[];
};

const LAST_SYNC_KEY = 'tezos:lastSync';
const MEDIA_CONCURRENCY = 2;
// Re-scan a little before the last sync so nothing falls between two runs.
const OVERLAP_MS = 10 * 60 * 1000;

let progress: SyncProgress = idle();

function idle(): SyncProgress {
  return {
    running: false,
    phase: 'idle',
    startedAt: null,
    finishedAt: null,
    tokensSeen: 0,
    tokensUpserted: 0,
    projectsTouched: 0,
    mediaTotal: 0,
    mediaDone: 0,
    mediaFailed: 0,
    errors: [],
  };
}

export function getSyncProgress(): SyncProgress {
  return progress;
}

function toRow(t: ObjktToken) {
  const dims = t.dimensions?.display?.dimensions ?? t.dimensions?.artifact?.dimensions;
  return {
    id: `${t.fa_contract}:${t.token_id}`,
    pk: t.pk,
    contract: t.fa_contract,
    tokenId: t.token_id,
    creator: t.creators[0]?.creator_address ?? '',
    name: t.name ?? '',
    description: t.description ?? '',
    mime: t.mime ?? '',
    artifactUri: t.artifact_uri ?? '',
    displayUri: t.display_uri ?? '',
    thumbnailUri: t.thumbnail_uri ?? '',
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    supply: t.supply ?? 1,
    tags: t.tags.map((x) => x.tag?.name).filter(Boolean).join(','),
    collectionName: t.fa?.name ?? '',
    collectionPath: t.fa?.path ?? '',
    mintedAt: t.timestamp ? new Date(t.timestamp) : null,
  };
}

async function syncTokens(wallets: string[], full: boolean) {
  const last = full ? null : (await db.setting.findUnique({ where: { key: LAST_SYNC_KEY } }))?.value ?? null;
  const since = last ? new Date(new Date(last).getTime() - OVERLAP_MS).toISOString() : null;
  const startedAt = new Date().toISOString();

  // Contracts owned by one of our wallets become projects (collected while paging).
  const ownContracts = new Map<string, { name: string; description: string; path: string }>();

  for await (const page of fetchCreatedTokens(wallets, since)) {
    progress.tokensSeen += page.length;
    for (const t of page) {
      if (!t.name && !t.artifact_uri) continue; // metadata not indexed yet
      const row = toRow(t);
      const { id, ...rest } = row;
      await db.token.upsert({ where: { id }, create: row, update: rest });
      progress.tokensUpserted++;
      if (t.fa?.creator_address && wallets.includes(t.fa.creator_address)) {
        ownContracts.set(t.fa_contract, {
          name: t.fa.name ?? t.fa_contract,
          description: t.fa.description ?? '',
          path: t.fa.path ?? '',
        });
      }
    }
  }

  await db.setting.upsert({
    where: { key: LAST_SYNC_KEY },
    create: { key: LAST_SYNC_KEY, value: startedAt },
    update: { value: startedAt },
  });
  return ownContracts;
}

/**
 * One project per contract you own. Created once with the collection's name
 * and description (editable afterwards); membership = every non-hidden token
 * of the contract, new tokens appended in mint order, hidden ones removed.
 */
async function syncContractProjects(ownContracts: Map<string, { name: string; description: string; path: string }>) {
  // Include contracts from earlier syncs too (incremental runs may not see them).
  const existing = await db.project.findMany({ where: { source: 'contract', contract: { not: null } } });
  for (const p of existing) if (p.contract && !ownContracts.has(p.contract)) ownContracts.set(p.contract, { name: p.title, description: '', path: '' });

  for (const [contract, meta] of ownContracts) {
    const tokens = await db.token.findMany({
      where: { contract, hidden: false },
      orderBy: { pk: 'asc' },
      select: { id: true, mintedAt: true },
    });
    if (tokens.length === 0) continue;

    let project = await db.project.findUnique({ where: { contract }, include: { tokens: true } });
    if (!project) {
      const max = await db.project.aggregate({ _max: { order: true } });
      project = await db.project.create({
        data: {
          title: meta.name,
          year: (tokens[0].mintedAt ?? new Date()).getFullYear(),
          category: 'Collection',
          description: meta.description,
          credits: `Minted on Tezos · ${contract}`,
          source: 'contract',
          contract,
          order: (max._max.order ?? -1) + 1,
        },
        include: { tokens: true },
      });
    }

    const have = new Set(project.tokens.map((pt) => pt.tokenId));
    const want = new Set(tokens.map((t) => t.id));
    const maxOrder = project.tokens.reduce((m, pt) => Math.max(m, pt.order), -1);
    let next = maxOrder + 1;

    await db.$transaction([
      db.projectToken.deleteMany({ where: { projectId: project.id, tokenId: { notIn: [...want] } } }),
      ...tokens
        .filter((t) => !have.has(t.id))
        .map((t) => db.projectToken.create({ data: { projectId: project.id, tokenId: t.id, order: next++ } })),
    ]);

    if (!project.coverTokenId || !want.has(project.coverTokenId)) {
      await db.project.update({ where: { id: project.id }, data: { coverTokenId: tokens[0].id } });
    }
    progress.projectsTouched++;
  }
}

async function syncMedia() {
  const tokens = await db.token.findMany({ where: { hidden: false } });
  const todo: { id: string; uri: string; fallback: string | null }[] = [];
  for (const t of tokens) {
    const uri = previewUri(t);
    if (!uri) continue;
    const key = mediaKeyFor(uri);
    const widths = t.mediaWidths ? t.mediaWidths.split(',').map(Number) : [];
    if (t.mediaKey && widths.length && (await hasVariants(t.mediaKey, widths))) continue;
    // Some platforms put a video in display_uri; the thumbnail is then the only still.
    const fallback = t.thumbnailUri && t.thumbnailUri !== uri ? t.thumbnailUri : null;
    todo.push({ id: t.id, uri, fallback });
  }
  progress.mediaTotal = todo.length;

  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const job = todo[i++];
      try {
        let m;
        try {
          m = await processImage(job.uri);
        } catch (e: any) {
          if (!job.fallback) throw e;
          m = await processImage(job.fallback);
        }
        await db.token.update({
          where: { id: job.id },
          data: {
            mediaKey: m.mediaKey,
            mediaWidths: m.mediaWidths.join(','),
            placeholder: m.placeholder,
            width: m.width,
            height: m.height,
          },
        });
        progress.mediaDone++;
      } catch (e: any) {
        progress.mediaFailed++;
        progress.errors.push(`${job.id}: ${e?.message ?? e}`);
        if (progress.errors.length > 50) progress.errors.shift();
      }
    }
  };
  await Promise.all(Array.from({ length: MEDIA_CONCURRENCY }, worker));
}

/** Run a sync. Resolves when finished; poll `getSyncProgress()` meanwhile. */
export async function runSync(opts: { full?: boolean; media?: boolean } = {}): Promise<SyncProgress> {
  if (progress.running) return progress;
  const wallets = tezosWallets();
  progress = { ...idle(), running: true, phase: 'tokens', startedAt: new Date().toISOString() };
  try {
    if (wallets.length === 0) throw new Error('TEZOS_WALLETS is not set in .env');
    const own = await syncTokens(wallets, !!opts.full);
    progress.phase = 'projects';
    await syncContractProjects(own);
    if (opts.media !== false) {
      progress.phase = 'media';
      await syncMedia();
    }
    progress.phase = 'done';
  } catch (e: any) {
    progress.phase = 'error';
    progress.errors.push(e?.message ?? String(e));
  } finally {
    progress.running = false;
    progress.finishedAt = new Date().toISOString();
  }
  return progress;
}
