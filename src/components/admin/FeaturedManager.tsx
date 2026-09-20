'use client';

import { useMemo, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { GripVertical, Loader2, Plus, Search, X } from 'lucide-react';
import type { Project } from '@/lib/types';
import { HOME_FEATURED } from '@/lib/content';
import { useSetFeatured } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function Cover({ p, className }: { p: Project; className?: string }) {
  const c = p.cover ?? p.media[0];
  return (
    <div className={cn('relative aspect-square overflow-hidden bg-muted', className)}>
      {c && <img src={c.url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={c.placeholder ? { backgroundImage: `url(${c.placeholder})`, backgroundSize: 'cover' } : undefined} />}
    </div>
  );
}

function Slot({ p, index, onRemove }: { p: Project; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1 }} className={cn('group relative border border-border bg-background', isDragging && 'shadow-lg')}>
      <Cover p={p} />
      <span className="absolute left-1.5 top-1.5 z-10 bg-black/60 px-1.5 py-0.5 tracking-mono text-[9px] uppercase tracking-[0.2em] text-white">{String(index + 1).padStart(2, '0')}</span>
      <button type="button" onClick={onRemove} title="Remove from home" className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
      <div {...attributes} {...listeners} className="absolute inset-y-0 left-0 z-10 flex w-7 cursor-grab items-center justify-center bg-gradient-to-r from-black/40 to-transparent text-white opacity-0 transition active:cursor-grabbing group-hover:opacity-100" aria-label="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="px-2 py-1.5">
        <p className="truncate text-xs">{p.title}</p>
        <p className="truncate tracking-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{p.section} · {p.year}</p>
      </div>
    </div>
  );
}

/** The projects shown on the home page: up to HOME_FEATURED, in order. Saves immediately. */
export function FeaturedManager({ projects }: { projects: Project[] }) {
  const set = useSetFeatured();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [q, setQ] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const featured = useMemo(() => projects.filter((p) => p.featured).sort((a, b) => a.featuredOrder - b.featuredOrder).slice(0, HOME_FEATURED), [projects]);
  const candidates = useMemo(() => {
    const term = q.trim().toLowerCase();
    return projects
      .filter((p) => p.published && p.section !== 'lab' && p.media.length > 0 && !p.featured)
      .filter((p) => !term || p.title.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
  }, [projects, q]);

  const save = async (ids: string[]) => {
    try {
      await set.mutateAsync(ids);
      toast.success('Home page updated', { description: 'Publish to make it live.' });
    } catch (e: any) {
      toast.error('Could not update', { description: e?.message });
    }
  };
  const ids = featured.map((p) => p.id);
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    save(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  return (
    <section className="mb-8 border border-border p-5">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="tracking-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Featured on the home page</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {featured.length} of {HOME_FEATURED} · drag to reorder · {featured.length === 0 ? 'nothing chosen yet — the first artworks are shown instead' : 'shown under “Selected works”'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {set.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} disabled={featured.length >= HOME_FEATURED}>
            <Plus className="mr-2 h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {featured.map((p, i) => (
              <Slot key={p.id} p={p} index={i} onRemove={() => save(ids.filter((x) => x !== p.id))} />
            ))}
            {Array.from({ length: Math.max(0, HOME_FEATURED - featured.length) }).map((_, i) => (
              <button
                key={`empty-${i}`}
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex aspect-[1/1.25] flex-col items-center justify-center gap-2 border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                <span className="tracking-mono text-[9px] uppercase tracking-[0.2em]">slot {featured.length + i + 1}</span>
              </button>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto thin-scrollbar">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl italic">Feature a project</DialogTitle>
            <DialogDescription className="text-xs tracking-mono uppercase tracking-[0.2em]">Published artworks and collabs · click to add</DialogDescription>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or category" className="h-8 w-72 pl-8 text-xs" autoFocus />
          </div>
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nothing to add.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {candidates.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    save([...ids, p.id]);
                    setPickerOpen(false);
                  }}
                  className="group border border-border text-left transition-colors hover:border-foreground"
                >
                  <Cover p={p} />
                  <div className="px-2 py-1.5">
                    <p className="truncate text-xs">{p.title}</p>
                    <p className="truncate tracking-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{p.section} · {p.year}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
