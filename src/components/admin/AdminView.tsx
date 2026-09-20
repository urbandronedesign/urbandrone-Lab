'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProjects, useDeleteProject, useReorderProjects, useSeedProjects, useStartSync, useSyncProgress } from '@/lib/queries';
import { TokenPool } from './TokenPool';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ProjectForm } from './ProjectForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, Pencil, GripVertical, ArrowLeft, Sparkles, Loader2, RefreshCw, LogOut, Hexagon } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Footer } from '@/components/gallery/Footer';
import { useUpdateProject } from '@/lib/queries';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';

function Row({
  project,
  index,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  project: Project;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: (pub: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  } as React.CSSProperties;

  const cover = project.cover ?? project.media[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'grid grid-cols-[24px_64px_1fr_60px_60px_88px_88px] items-center gap-3 border-b border-border px-3 py-3',
        isDragging && 'bg-muted/50 shadow'
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-8 w-6 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="relative aspect-[4/3] w-16 overflow-hidden bg-muted">
        {cover && (
          <img
            src={cover.url}
            alt={cover.alt || project.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            style={cover.placeholder ? { backgroundImage: `url(${cover.placeholder})`, backgroundSize: 'cover' } : undefined}
          />
        )}
      </div>

      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate font-display text-base leading-tight">
          {project.title}
          {project.source === 'contract' && (
            <span title={project.contract ?? ''} className="inline-flex shrink-0 items-center gap-1 border border-border px-1.5 py-0.5 font-sans tracking-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
              <Hexagon className="h-2.5 w-2.5" /> contract
            </span>
          )}
        </p>
        <p className="tracking-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {project.category} · {project.year} · {project.tokens.length} tokens · {project.images.length} img
        </p>
      </div>

      <span className="tracking-mono text-[10px] text-muted-foreground">
        {String(index + 1).padStart(2, '0')}
      </span>

      <Switch
        checked={project.published}
        onCheckedChange={(v) => onTogglePublish(v)}
        aria-label="Toggle published"
      />

      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function AdminView() {
  const router = useRouter();
  const { data, isLoading, error } = useProjects(true);
  const del = useDeleteProject();
  const reorder = useReorderProjects();
  const seed = useSeedProjects();
  const update = useUpdateProject();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Project | null>(null);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [tab, setTab] = useState<'projects' | 'tokens'>('projects');
  const sync = useSyncProgress();
  const startSync = useStartSync();
  const progress = sync.data?.progress;
  const syncing = !!progress?.running;
  const syncLabel = !progress || !syncing
    ? 'Sync Tezos'
    : progress.phase === 'tokens'
    ? `Fetching tokens… ${progress.tokensSeen}`
    : progress.phase === 'projects'
    ? 'Updating collections…'
    : `Media ${progress.mediaDone}/${progress.mediaTotal}`;

  const onSync = async (full = false) => {
    try {
      await startSync.mutateAsync({ full });
      toast.message(full ? 'Full sync started' : 'Sync started', { description: 'Fetching your tokens from objkt…' });
    } catch (e: any) {
      toast.error('Sync failed to start', { description: e?.message });
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const projects = data?.projects ?? [];
  const editing = editingId ? projects.find((p) => p.id === editingId) ?? null : null;

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = projects.findIndex((p) => p.id === active.id);
    const newIndex = projects.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextOrder = arrayMove(projects, oldIndex, newIndex);
    // optimistic fire-and-forget
    try {
      await reorder.mutateAsync(nextOrder.map((p) => p.id));
    } catch (e: any) {
      toast.error('Reorder failed', { description: e?.message });
    }
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  };

  const onTogglePublish = async (project: Project, pub: boolean) => {
    try {
      await update.mutateAsync({ id: project.id, published: pub });
      toast.success(pub ? 'Published' : 'Unpublished');
    } catch (e: any) {
      toast.error('Update failed', { description: e?.message });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen flex-col"
    >
      {/* Admin header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto w-full max-w-[1600px] px-6 md:px-12 lg:px-24">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <h1 className="font-display text-2xl italic">Atelier</h1>
              <span className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                · Admin
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSync(false)}
                onContextMenu={(e) => { e.preventDefault(); onSync(true); }}
                disabled={syncing || startSync.isPending}
                title="Fetch new/changed tokens from objkt and refresh media. Right-click for a full re-sync."
              >
                {syncing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Hexagon className="mr-2 h-3.5 w-3.5" />}
                {syncLabel}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmSeed(true)}
                disabled={seed.isPending}
              >
                {seed.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
                Seed demo
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                  Back to gallery
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} title="Sign out">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign out
              </Button>
              <Button size="sm" onClick={() => { setEditingId(null); setFormOpen(true); }}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                New project
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8 md:px-12 lg:px-24">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'projects' | 'tokens')}>
        <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3">
          <TabsList className="h-auto bg-transparent p-0">
            <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent px-0 pb-1 font-display text-xl italic data-[state=active]:border-foreground data-[state=active]:shadow-none">
              Projects
            </TabsTrigger>
            <TabsTrigger value="tokens" className="ml-6 rounded-none border-b-2 border-transparent px-0 pb-1 font-display text-xl italic data-[state=active]:border-foreground data-[state=active]:shadow-none">
              Tezos tokens
            </TabsTrigger>
          </TabsList>
          <span className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {tab === 'projects' ? `${projects.length} total · drag rows to reorder` : 'select tokens to hide / show · ★ = your contracts'}
          </span>
        </div>

        {progress && !syncing && progress.phase !== 'idle' && (
          <p className="mb-4 tracking-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Last sync: {progress.phase} · {progress.tokensUpserted} tokens · {progress.projectsTouched} collections · media {progress.mediaDone}/{progress.mediaTotal}
            {progress.mediaFailed ? ` · ${progress.mediaFailed} failed (will retry next sync)` : ''}
            {progress.errors.length ? ` · ${progress.errors[progress.errors.length - 1].slice(0, 120)}` : ''}
          </p>
        )}

        <TabsContent value="tokens" className="mt-0">
          <TokenPool />
        </TabsContent>
        <TabsContent value="projects" className="mt-0">

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-40 items-center justify-center text-destructive">
            Error loading projects
          </div>
        ) : projects.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
            <p className="font-display text-2xl italic text-muted-foreground">Empty studio.</p>
            <Button size="sm" onClick={() => { setEditingId(null); setFormOpen(true); }}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Create your first project
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="overflow-hidden rounded-md border border-border">
                {/* column header */}
                <div className="grid grid-cols-[24px_64px_1fr_60px_60px_88px_88px] items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground tracking-mono">
                  <span />
                  <span>Cover</span>
                  <span>Title</span>
                  <span>Order</span>
                  <span>Live</span>
                  <span>Edit</span>
                  <span>Delete</span>
                </div>
                {projects.map((p, i) => (
                  <Row
                    key={p.id}
                    project={p}
                    index={i}
                    onEdit={() => { setEditingId(p.id); setFormOpen(true); }}
                    onDelete={() => setConfirmDel(p)}
                    onTogglePublish={(pub) => onTogglePublish(p, pub)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Hint card */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { t: '1. Compose', d: 'Click a project cell or use New Project. Fill title, year, category, two-paragraph description.' },
            { t: '2. Curate images', d: 'Drag images to upload, reorder by drag handle, tap the star to set the cover.' },
            { t: '3. Publish', d: 'Toggle the live switch. Drag rows to reorder the gallery index. Done.' },
          ].map((c) => (
            <div key={c.t} className="rounded-md border border-border bg-muted/20 p-4">
              <p className="font-display text-base italic">{c.t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
        </TabsContent>
        </Tabs>
      </main>

      <Footer projectCount={projects.length} />

      {/* Project form dialog */}
      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editing}
        onSaved={(id) => {
          setFormOpen(false);
          setEditingId(null);
          // optionally open it in the gallery
          void id;
        }}
      />

      {/* Delete confirm */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl italic">Delete project?</DialogTitle>
            <DialogDescription>
              This will permanently remove <strong>{confirmDel?.title}</strong> and detach its images. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirmDel) return;
                try {
                  await del.mutateAsync(confirmDel.id);
                  toast.success('Project deleted');
                  setConfirmDel(null);
                } catch (e: any) {
                  toast.error('Delete failed', { description: e?.message });
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seed confirm */}
      <Dialog open={confirmSeed} onOpenChange={setConfirmSeed}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl italic">Seed demo content?</DialogTitle>
            <DialogDescription>
              This will <strong>erase all current projects and images</strong> and replace them with the curated demo collection (4 projects, ~17 images). Useful for restarting the template.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmSeed(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                try {
                  const r = await seed.mutateAsync(true);
                  toast.success(`Seeded ${r.created ?? 0} projects`);
                  setConfirmSeed(false);
                } catch (e: any) {
                  toast.error('Seed failed', { description: e?.message });
                }
              }}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Reset & seed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
