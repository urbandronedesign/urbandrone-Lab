// Minimal, polite client for the public objkt.com GraphQL API.
//
// The API is a shared Hasura endpoint (~120 requests/minute per IP, 500 rows
// per query). We only ever call it from the admin's machine, ask for exactly
// the fields we store, page with a cursor at the maximum page size, pause
// between pages and back off on errors. A full catalogue of a few hundred
// tokens is 1–2 requests; an incremental sync is usually one.

import { OBJKT_GRAPHQL } from './config';

export type ObjktToken = {
  pk: number;
  token_id: string;
  fa_contract: string;
  name: string | null;
  description: string | null;
  mime: string | null;
  artifact_uri: string | null;
  display_uri: string | null;
  thumbnail_uri: string | null;
  dimensions: { display?: { dimensions?: { width?: number; height?: number } } ; artifact?: { dimensions?: { width?: number; height?: number } } } | null;
  supply: number | null;
  timestamp: string | null;
  last_metadata_update: string | null;
  metadata_status: string | null;
  tags: { tag: { name: string } | null }[];
  creators: { creator_address: string }[];
  fa: {
    name: string | null;
    path: string | null;
    description: string | null;
    creator_address: string | null;
    collection_type: string | null;
  } | null;
};

const PAGE_SIZE = 500;
const PAUSE_BETWEEN_PAGES_MS = 600;
const MAX_RETRIES = 4;
const USER_AGENT = 'urbandrone.xyz site sync (github.com/urbandronedesign/urbandrone-Lab)';

const TOKENS_QUERY = /* GraphQL */ `
query CreatedTokens($wallets: [String!]!, $afterPk: bigint!, $since: timestamptz, $limit: Int!) {
  token(
    where: {
      creators: { creator_address: { _in: $wallets } }
      pk: { _gt: $afterPk }
      _or: [
        { timestamp: { _gt: $since } }
        { last_metadata_update: { _gt: $since } }
      ]
    }
    order_by: { pk: asc }
    limit: $limit
  ) {
    pk token_id fa_contract name description mime
    artifact_uri display_uri thumbnail_uri dimensions
    supply timestamp last_metadata_update metadata_status
    tags { tag { name } }
    creators { creator_address }
    fa { name path description creator_address collection_type }
  }
}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  let attempt = 0;
  for (;;) {
    const res = await fetch(OBJKT_GRAPHQL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': USER_AGENT },
      body: JSON.stringify({ query, variables }),
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
      if (json.errors?.length) throw new Error(`objkt: ${json.errors.map((e) => e.message).join('; ')}`);
      return json.data as T;
    }
    // 429 / 5xx: back off exponentially, then give up so we never hammer the API.
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get('retry-after')) * 1000;
      await sleep(retryAfter > 0 ? retryAfter : 1500 * 2 ** attempt);
      attempt++;
      continue;
    }
    throw new Error(`objkt: HTTP ${res.status}`);
  }
}

/**
 * Fetch tokens created by `wallets`, changed since `since` (ISO date; omit for
 * a full sync). Pages are yielded as they arrive so callers can persist
 * progressively.
 */
export async function* fetchCreatedTokens(
  wallets: string[],
  since?: string | null
): AsyncGenerator<ObjktToken[]> {
  let afterPk = 0;
  for (;;) {
    const data = await gql<{ token: ObjktToken[] }>(TOKENS_QUERY, {
      wallets,
      afterPk,
      since: since ?? '1970-01-01T00:00:00Z',
      limit: PAGE_SIZE,
    });
    const page = data.token;
    if (page.length === 0) return;
    yield page;
    if (page.length < PAGE_SIZE) return;
    afterPk = page[page.length - 1].pk;
    await sleep(PAUSE_BETWEEN_PAGES_MS);
  }
}
