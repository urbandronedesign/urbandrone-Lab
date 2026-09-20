'use client';

import type { Project } from '@/lib/types';
import { Hero } from './Hero';
import { Cell } from './Cell';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const ease = [0.16, 1, 0.3, 1] as const;

export function GalleryView({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
        <div>
          <p className="font-display text-3xl italic text-muted-foreground">An empty room.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No projects yet. Sign in to the admin to create your first project.
          </p>
        </div>
        <Button variant="default" asChild>
          <Link href="/admin">Open Admin</Link>
        </Button>
      </div>
    );
  }

  const [featured, ...rest] = projects;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease }}
      className="w-full"
    >
      <Hero project={featured} index={0} />

      <div className="mx-auto w-full max-w-[1600px] px-6 py-12 md:px-12 md:py-20 lg:px-24">
        {/* Section heading */}
        <div className="mb-10 flex items-end justify-between border-b border-border pb-4">
          <h2 className="font-display text-2xl md:text-3xl italic">Index</h2>
          <span className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {String(projects.length).padStart(2, '0')} works · {featured.year}
          </span>
        </div>

        <div className="grid grid-cols-12 gap-x-6 gap-y-12">
          {rest.map((p, i) => (
            <Cell key={p.id} project={p} index={i + 1} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
