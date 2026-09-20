'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Project, Token } from './types';

const BASE = '';

async function jsonOrThrow<T>(input: Response | Promise<Response>): Promise<T> {
  const res = await input;
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export function useProjects(all = false) {
  return useQuery<{ projects: Project[] }>({
    queryKey: ['projects', { all }],
    queryFn: () => jsonOrThrow(fetch(`${BASE}/api/projects${all ? '?all=true' : ''}`)),
    staleTime: 30_000,
  });
}

export function useProject(id: string | null | undefined) {
  return useQuery<{ project: Project }>({
    queryKey: ['project', id],
    queryFn: () => jsonOrThrow(fetch(`${BASE}/api/projects/${id}`)),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export type ProjectInput = {
  title: string;
  year: number;
  category: string;
  description?: string;
  credits?: string;
  published?: boolean;
  coverId?: string | null;
  coverTokenId?: string | null;
  imageIds?: string[];
  tokenIds?: string[];
  order?: number;
  section?: 'artworks' | 'lab' | 'collabs';
  slug?: string;
  featured?: boolean;
  tags?: string[];
  links?: { label: string; url: string }[];
};

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) =>
      jsonOrThrow<{ project: Project }>(
        fetch(`${BASE}/api/projects`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<ProjectInput>) =>
      jsonOrThrow<{ project: Project }>(
        fetch(`${BASE}/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        })
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', vars.id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      jsonOrThrow<{ ok: boolean }>(
        fetch(`${BASE}/api/projects/${id}`, { method: 'DELETE' })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useReorderProjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: string[]) =>
      jsonOrThrow<{ ok: boolean }>(
        fetch(`${BASE}/api/projects/reorder`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ order }),
        })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      jsonOrThrow<{ ok: boolean }>(
        fetch(`${BASE}/api/images/${id}`, { method: 'DELETE' })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUploadImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${BASE}/api/upload`, { method: 'POST', body: fd });
      return jsonOrThrow<{ image: { id: string; url: string; width: number | null; height: number | null; alt: string } }>(res);
    },
    onSuccess: () => {
      // No need to invalidate projects — uploaded images are not yet attached
    },
  });
}


// ---------------------------------------------------------------------------
// Tezos tokens (admin only)

export type TokenPoolResponse = {
  tokens: Token[];
  contracts: { contract: string; name: string; count: number; own: boolean }[];
  wallets: string[];
};

export function useTokenPool(filters: { contract?: string | null; q?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.contract) params.set('contract', filters.contract);
  if (filters.q) params.set('q', filters.q);
  const qs = params.toString();
  return useQuery<TokenPoolResponse>({
    queryKey: ['tokens', filters.contract ?? null, filters.q ?? ''],
    queryFn: () => jsonOrThrow(fetch(`${BASE}/api/tokens${qs ? `?${qs}` : ''}`)),
    staleTime: 30_000,
  });
}

export function useSetTokenHidden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      jsonOrThrow<{ token: Token }>(
        fetch(`${BASE}/api/tokens/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ hidden }),
        })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

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

/** Polls sync progress every 1.5s while a sync runs. */
export function useSyncProgress() {
  return useQuery<{ progress: SyncProgress; wallets: string[] }>({
    queryKey: ['tezos-sync'],
    queryFn: () => jsonOrThrow(fetch(`${BASE}/api/tezos/sync`)),
    refetchInterval: (q) => (q.state.data?.progress.running ? 1500 : false),
    staleTime: 0,
  });
}

export function useStartSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { full?: boolean; media?: boolean }) =>
      jsonOrThrow<{ started: boolean }>(
        fetch(`${BASE}/api/tezos/sync`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(opts),
        })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tezos-sync'] });
    },
  });
}
