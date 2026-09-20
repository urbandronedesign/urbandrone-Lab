'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Project } from './types';

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
  imageIds?: string[];
  order?: number;
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

export function useSeedProjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reset: boolean) =>
      jsonOrThrow<{ ok: boolean; created?: number; skipped?: boolean }>(
        fetch(`${BASE}/api/seed`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reset }),
        })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
