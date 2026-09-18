'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useGalleryStore, parseViewFromHash, syncUrl } from '@/lib/store';
import { GalleryView } from './GalleryView';
import { ProjectView } from '@/components/project/ProjectView';
import { AdminView } from '@/components/admin/AdminView';
import { Footer } from './Footer';
import type { Project } from '@/lib/types';

export function Gallery({ initialProjects }: { initialProjects: Project[] }) {
  const qc = useQueryClient();
  const view = useGalleryStore((s) => s.view);
  const selectedProjectId = useGalleryStore((s) => s.selectedProjectId);
  const setView = useGalleryStore((s) => s.setView);
  const openProject = useGalleryStore((s) => s.openProject);

  // Seed TanStack cache with SSR data
  useEffect(() => {
    qc.setQueryData(['projects', { all: false }], { projects: initialProjects });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On mount + on popstate: sync store from URL
  useEffect(() => {
    const apply = () => {
      const { view: v, p } = parseViewFromHash();
      if (v === 'admin') setView('admin');
      else if (v === 'project' && p) openProject(p);
      else setView('gallery');
    };
    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever view/selected change, update URL
  useEffect(() => {
    syncUrl(view, selectedProjectId);
    // scroll to top on view change
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [view, selectedProjectId]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AnimatePresence mode="wait">
        {view === 'gallery' && (
          <GalleryView key="gallery" projects={initialProjects} />
        )}
        {view === 'project' && selectedProjectId && (
          <ProjectView
            key={`project-${selectedProjectId}`}
            id={selectedProjectId}
            allProjects={initialProjects.map((p) => ({ id: p.id, title: p.title }))}
          />
        )}
        {view === 'admin' && <AdminView key="admin" />}
      </AnimatePresence>

      {view !== 'admin' && view !== 'project' && <Footer projectCount={initialProjects.length} />}
    </div>
  );
}
