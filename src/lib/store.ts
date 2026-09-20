'use client';

import { create } from 'zustand';
import type { View } from './types';

type GalleryStore = {
  view: View;
  selectedProjectId: string | null;
  lightboxOpen: boolean;
  lightboxIndex: number;
  setView: (v: View) => void;
  openProject: (id: string) => void;
  setLightboxOpen: (open: boolean) => void;
  setLightboxIndex: (i: number) => void;
  reset: () => void;
};

export const useGalleryStore = create<GalleryStore>((set) => ({
  view: 'gallery',
  selectedProjectId: null,
  lightboxOpen: false,
  lightboxIndex: 0,
  setView: (v) => set({ view: v }),
  openProject: (id) => set({ view: 'project', selectedProjectId: id, lightboxOpen: false, lightboxIndex: 0 }),
  setLightboxOpen: (open) => set({ lightboxOpen: open }),
  setLightboxIndex: (i) => set({ lightboxIndex: i }),
  reset: () => set({ view: 'gallery', selectedProjectId: null, lightboxOpen: false, lightboxIndex: 0 }),
}));

// Helpers to sync URL <-> store
export function parseViewFromHash(): { view: View; p: string | null } {
  if (typeof window === 'undefined') return { view: 'gallery', p: null };
  const u = new URL(window.location.href);
  const v = (u.searchParams.get('v') as View | null) ?? 'gallery';
  const p = u.searchParams.get('p');
  if (v === 'project' && p) return { view: 'project', p };
  return { view: 'gallery', p: null };
}

export function syncUrl(view: View, projectId: string | null) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('v');
  url.searchParams.delete('p');
  if (view === 'project' && projectId) {
    url.searchParams.set('v', 'project');
    url.searchParams.set('p', projectId);
  }
  window.history.replaceState(null, '', url.toString());
}
